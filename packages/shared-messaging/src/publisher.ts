import {
  getCorrelationId,
  getTraceContext,
  injectObservabilityHeaders,
  withDependencyTelemetry,
} from '@forgekit/shared-observability';
import type { ConfirmChannel } from 'amqplib';

import type { PublishOptions } from './types.js';

export const publishMessage = async <T>(
  channel: ConfirmChannel,
  exchange: string,
  routingKey: string,
  payload: T,
  options: PublishOptions = {}
): Promise<void> => {
  await withDependencyTelemetry(`rabbitmq.${exchange}`, { operation: 'publish' }, async () => {
    const headers = injectObservabilityHeaders({
      ...(options.headers ?? {}),
      'x-correlation-id': getCorrelationId(),
      traceparent: getTraceContext(),
    } as Record<string, string>);
    const body = Buffer.from(JSON.stringify(payload));

    channel.publish(exchange, routingKey, body, {
      contentType: 'application/json',
      persistent: options.persistent ?? true,
      headers,
    });

    await channel.waitForConfirms();
  });
};
