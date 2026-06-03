import {
  extractObservabilityContextFromHeaders,
  logger,
  runWithObservabilityContext,
  withMessageTelemetry,
} from '@forgekit/shared-observability';
import { extractIdentityFromMessageHeaders } from '@forgekit/shared-security';
import type { ConsumeMessage, ConfirmChannel } from 'amqplib';

import type { ConsumerErrorType, DlqReason } from './messaging-metrics.js';
import {
  messagingConsumedTotal,
  messagingConsumerErrorsTotal,
  messagingDlqTotal,
  messagingProcessingDurationSeconds,
} from './messaging-metrics.js';
import { NonRetryableError, isRetryExhausted, parseRetryCount } from './retry-policy.js';
import type { MessageHandler, MessagingClientOptions, SubscribeOptions } from './types.js';

/**
 * Classifies an error into a normalized error type for metrics.
 * FR-024a requires low-cardinality labels only.
 */
const classifyErrorType = (error: unknown): ConsumerErrorType => {
  if (!(error instanceof NonRetryableError)) {
    return 'handler_error';
  }

  const message = error.message.toLowerCase();

  if (message.includes('invalid json')) {
    return 'invalid_json';
  }

  if (message.includes('content type') || message.includes('content-type')) {
    return 'invalid_content_type';
  }

  if (message.includes('validation')) {
    return 'validation_failed';
  }

  return 'unknown';
};

/**
 * Maps a consumer error classification to a DLQ reason label.
 */
const classifyDlqReason = (error: unknown, isExhausted: boolean): DlqReason => {
  if (error instanceof NonRetryableError) {
    const errorType = classifyErrorType(error);

    if (errorType === 'invalid_json') {
      return 'invalid_json';
    }

    if (errorType === 'invalid_content_type') {
      return 'invalid_content_type';
    }

    if (errorType === 'validation_failed') {
      return 'validation_failed';
    }

    return 'non_retryable';
  }

  if (isExhausted) {
    return 'retry_exhausted';
  }

  return 'non_retryable';
};

/**
 * Publishes a message to the DLQ using confirm-then-ack per FR-020.
 * Only acknowledges the original message after the DLQ publish is broker-confirmed.
 * If the DLQ publish fails, the original message is left unacked so it is not lost.
 */
const publishToDlq = async (
  channel: ConfirmChannel,
  queue: string,
  message: ConsumeMessage,
  error: unknown
): Promise<boolean> => {
  const dlqQueue = `${queue}.dlq`;

  try {
    const errorMessage = error instanceof Error ? error.message : String(error);

    channel.publish('', dlqQueue, message.content, {
      headers: {
        ...message.properties.headers,
        'x-dlq-reason': errorMessage,
        'x-original-queue': queue,
      },
      contentType: message.properties.contentType,
      persistent: true,
    });

    await channel.waitForConfirms();
    channel.ack(message);
    return true;
  } catch (dlqError) {
    logger.error(
      { err: dlqError, queue, dlqQueue },
      'Failed to publish message to DLQ, leaving original message unacked'
    );

    // SEC-006: Definitively reject the message with nack(requeue: false) to prevent
    // an infinite redelivery loop. If we leave the message unacknowledged and the
    // connection closes, RabbitMQ requeues it; it will hit the same broken DLQ again.
    // Operators can recover the message via RabbitMQ shovel or manual intervention.
    channel.nack(message, false, false);
    logger.warn(
      { queue, dlqQueue, err: dlqError },
      'DLQ publish failed — message definitively rejected (nack no-requeue)'
    );
    return false;
  }
};

export const subscribeQueue = async <T>(
  channel: ConfirmChannel,
  queue: string,
  handler: MessageHandler<T>,
  options: SubscribeOptions<T>,
  clientOptions: MessagingClientOptions
): Promise<void> => {
  if (options.prefetch) {
    await channel.prefetch(options.prefetch);
  }

  const maxAttempts = clientOptions.retry?.maxAttempts ?? 3;
  const serviceName = clientOptions.serviceName;

  await channel.consume(
    queue,
    async (message: ConsumeMessage | null) => {
      if (!message) {
        return;
      }

      const start = process.hrtime.bigint();
      const headers = (message.properties.headers ?? {}) as Record<string, unknown>;
      const incomingHeaders = {
        'x-correlation-id': String(headers['x-correlation-id'] ?? ''),
        traceparent: String(headers.traceparent ?? ''),
      };
      const context = extractObservabilityContextFromHeaders(incomingHeaders, serviceName);
      const retryCount = parseRetryCount(message, queue);

      await runWithObservabilityContext(context, async () => {
        try {
          // FR-023c: Check content type before parsing if enforcement is enabled
          if (options.requireJsonContentType) {
            const contentType = message.properties.contentType;

            if (!contentType || !contentType.includes('application/json')) {
              throw new NonRetryableError(
                `Invalid content type: expected application/json, got '${contentType ?? 'undefined'}'`
              );
            }
          }

          // FR-023a: Classify JSON parse failures as NonRetryableError
          let rawPayload: unknown;
          try {
            rawPayload = JSON.parse(message.content.toString('utf8'));
          } catch {
            throw new NonRetryableError('Invalid JSON: message body is not valid JSON');
          }

          // FR-023b: Run optional payload validation before handler execution
          let payload: T;
          if (options.validate) {
            try {
              payload = await options.validate(rawPayload);
            } catch (validationError) {
              const detail = validationError instanceof Error ? validationError.message : String(validationError);
              throw new NonRetryableError(`Payload validation failed: ${detail}`);
            }
          } else {
            payload = rawPayload as T;
          }

          await withMessageTelemetry(`rabbitmq.consume.${queue}`, { operation: 'consume' }, async () => {
            await handler(payload, {
              correlationId: context.correlationId,
              traceparent: context.traceparent,
              retryCount,
              headers,
              identity: extractIdentityFromMessageHeaders(headers),
              rawMessage: message,
            });
          });

          channel.ack(message);
          messagingConsumedTotal.labels(serviceName, queue, 'success').inc();
          const duration = Number(process.hrtime.bigint() - start) / 1_000_000_000;
          messagingProcessingDurationSeconds.labels(serviceName, queue, 'success').observe(duration);
        } catch (error) {
          const isNonRetryable = error instanceof NonRetryableError;
          const exhausted = !isNonRetryable && isRetryExhausted(message, queue, maxAttempts);
          const errorType = classifyErrorType(error);
          const duration = Number(process.hrtime.bigint() - start) / 1_000_000_000;

          messagingConsumedTotal.labels(serviceName, queue, 'error').inc();
          messagingConsumerErrorsTotal.labels(serviceName, queue, errorType).inc();
          messagingProcessingDurationSeconds.labels(serviceName, queue, 'error').observe(duration);

          logger.error(
            { err: error, queue, retryCount, isNonRetryable, exhausted },
            'Message processing failed'
          );

          if (isNonRetryable || exhausted) {
            // FR-020: Publish to DLQ with confirm-then-ack
            const dlqReason = classifyDlqReason(error, exhausted);
            messagingDlqTotal.labels(serviceName, queue, dlqReason).inc();
            await publishToDlq(channel, queue, message, error);
          } else {
            // Retryable and not exhausted: nack without requeue.
            // RabbitMQ dead-letter routing sends to retry exchange → retry queue (TTL) → back to original queue.
            channel.nack(message, false, false);
          }
        }
      });
    },
    { noAck: options.noAck ?? false }
  );
};
