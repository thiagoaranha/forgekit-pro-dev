// SCAFFOLD EXAMPLE — Replace with domain-specific messaging logic.
// This module demonstrates RabbitMQ publish/consume with correlation ID propagation.
// It is safe to delete or restructure once you have real domain events in place.

import {
    extractObservabilityContextFromHeaders,
    getCorrelationId,
    getTraceContext,
    injectObservabilityHeaders,
    logger,
    runWithObservabilityContext,
    withMessageTelemetry,
} from '@forgekit/shared-observability';

// Exchange and queue are namespaced to avoid conflicts with other services.
const EXCHANGE_NAME = '{{SERVICE_NAME}}.events';
const QUEUE_NAME = '{{SERVICE_NAME}}.example.queue';
const ROUTING_KEY = 'example.created';

export type ExampleEventPayload = {
    id: string;
    correlationId?: string;
    traceparent?: string;
    occurredAt: string;
};

/**
 * Publishes an example domain event to RabbitMQ.
 *
 * @param channel - An open amqplib channel (inject from infrastructure setup).
 * @param payload - The event payload to publish.
 *
 * NOTE: This is a scaffold stub. Replace with your domain event producer.
 */
export async function publishExampleEvent(
    channel: {
        assertExchange: (name: string, type: string, opts: object) => Promise<void>;
        publish: (exchange: string, routingKey: string, content: Buffer, opts: object) => boolean;
    },
    payload: ExampleEventPayload
): Promise<void> {
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    const content = Buffer.from(JSON.stringify(payload));
    const observabilityHeaders = injectObservabilityHeaders({
        ...(payload.correlationId ? { 'x-correlation-id': payload.correlationId } : {}),
        ...(payload.traceparent ? { traceparent: payload.traceparent } : {}),
    });

    channel.publish(EXCHANGE_NAME, ROUTING_KEY, content, {
        contentType: 'application/json',
        correlationId: observabilityHeaders['x-correlation-id'],
        headers: observabilityHeaders,
        persistent: true,
    });

    logger.info(
        {
            exchange: EXCHANGE_NAME,
            routingKey: ROUTING_KEY,
            traceparent: observabilityHeaders.traceparent,
        },
        'Example event published'
    );
}

/**
 * Starts consuming example events from RabbitMQ.
 *
 * @param channel - An open amqplib channel (inject from infrastructure setup).
 *
 * NOTE: This is a scaffold stub. Replace with your domain event consumer.
 */
export async function startExampleConsumer(channel: {
    assertExchange: (name: string, type: string, opts: object) => Promise<void>;
    assertQueue: (name: string, opts: object) => Promise<{ queue: string }>;
    bindQueue: (queue: string, exchange: string, routingKey: string) => Promise<void>;
    consume: (queue: string, handler: (msg: unknown) => void) => Promise<void>;
    nack?: (msg: unknown, allUpTo?: boolean, requeue?: boolean) => void;
}): Promise<void> {
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

    await channel.consume(QUEUE_NAME, (msg: unknown) => {
        // amqplib returns null when the consumer is cancelled.
        if (msg === null) {
            return;
        }

        try {
            const raw = msg as {
                content: Buffer;
                properties: {
                    correlationId?: string;
                    headers?: Record<string, string | string[] | undefined>;
                };
            };
            const payload: ExampleEventPayload = JSON.parse(raw.content.toString());
            const context = extractObservabilityContextFromHeaders(
                {
                    ...raw.properties.headers,
                    'x-correlation-id': raw.properties.correlationId ?? payload.correlationId,
                    traceparent: raw.properties.headers?.traceparent ?? payload.traceparent ?? getTraceContext(),
                },
                '{{SERVICE_NAME}}'
            );

            runWithObservabilityContext(context, () =>
                withMessageTelemetry('example_event.consume', { attributes: { queue: QUEUE_NAME } }, () => {
                    logger.info({ queue: QUEUE_NAME, eventId: payload.id }, 'Example event consumed');

                    // Replace with idempotent domain processing logic.
                })
            );
        } catch (error) {
            logger.error(
                {
                    err: error,
                    queue: QUEUE_NAME,
                    correlationId: getCorrelationId(),
                    traceparent: getTraceContext(),
                },
                'Failed to process example event'
            );

            // Broker-specific implementations should route exhausted failures to retry or DLQ here.
            channel.nack?.(msg, false, false);
        }
    });

    logger.info({ queue: QUEUE_NAME }, 'Example consumer started');
}
