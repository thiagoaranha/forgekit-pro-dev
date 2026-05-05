import {
  extractObservabilityContextFromHeaders,
  runWithObservabilityContext,
  withMessageTelemetry,
} from '@forgekit/shared-observability';
import { extractIdentityFromMessageHeaders } from '@forgekit/shared-security';
import type { ConsumeMessage, ConfirmChannel } from 'amqplib';

import {
  messagingConsumedTotal,
  messagingConsumerErrorsTotal,
  messagingDlqTotal,
  messagingProcessingDurationSeconds,
} from './messaging-metrics';
import { NonRetryableError, isRetryExhausted, parseRetryCount } from './retry-policy';
import type { MessageHandler, MessagingClientOptions, SubscribeOptions } from './types';

export const subscribeQueue = async <T>(
  channel: ConfirmChannel,
  queue: string,
  handler: MessageHandler<T>,
  options: SubscribeOptions,
  clientOptions: MessagingClientOptions
): Promise<void> => {
  if (options.prefetch) {
    await channel.prefetch(options.prefetch);
  }

  const maxAttempts = clientOptions.retry?.maxAttempts ?? 3;

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
      const context = extractObservabilityContextFromHeaders(incomingHeaders, clientOptions.serviceName);
      const retryCount = parseRetryCount(message, queue);

      await runWithObservabilityContext(context, async () => {
        try {
          const payload = JSON.parse(message.content.toString('utf8')) as T;

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
          messagingConsumedTotal.labels(clientOptions.serviceName, queue, 'success').inc();
          const duration = Number(process.hrtime.bigint() - start) / 1_000_000_000;
          messagingProcessingDurationSeconds.labels(clientOptions.serviceName, queue, 'success').observe(duration);
        } catch (error) {
          const retryable = !(error instanceof NonRetryableError);
          const exhausted = isRetryExhausted(message, queue, maxAttempts);

          messagingConsumedTotal.labels(clientOptions.serviceName, queue, 'error').inc();
          messagingConsumerErrorsTotal.labels(clientOptions.serviceName, queue).inc();
          const duration = Number(process.hrtime.bigint() - start) / 1_000_000_000;
          messagingProcessingDurationSeconds.labels(clientOptions.serviceName, queue, 'error').observe(duration);

          if (!retryable || exhausted) {
            messagingDlqTotal.labels(clientOptions.serviceName, queue).inc();
          }

          channel.nack(message, false, false);
        }
      });
    },
    { noAck: options.noAck ?? false }
  );
};
