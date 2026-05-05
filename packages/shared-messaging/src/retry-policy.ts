import type { Channel, ConsumeMessage, Options } from 'amqplib';

export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

type XDeathEntry = {
  queue?: string;
  count?: number;
};

export const parseRetryCount = (message: ConsumeMessage, queueName: string): number => {
  const xDeathRaw = message.properties.headers?.['x-death'];

  if (!Array.isArray(xDeathRaw)) {
    return 0;
  }

  const match = (xDeathRaw as XDeathEntry[]).find((entry) => entry.queue === queueName);
  return typeof match?.count === 'number' ? match.count : 0;
};

export const isRetryExhausted = (message: ConsumeMessage, queueName: string, maxAttempts: number): boolean =>
  parseRetryCount(message, queueName) >= maxAttempts;

export const assertQueueWithDlq = async (
  channel: Channel,
  queueName: string,
  options: Options.AssertQueue = {},
  retryBaseDelayMs = 1000
): Promise<void> => {
  const retryExchange = `${queueName}.retry.exchange`;
  const retryQueue = `${queueName}.retry`;
  const dlq = `${queueName}.dlq`;

  await channel.assertExchange(retryExchange, 'direct', { durable: true });
  await channel.assertQueue(dlq, { durable: true });

  await channel.assertQueue(retryQueue, {
    durable: true,
    deadLetterExchange: '',
    deadLetterRoutingKey: queueName,
    messageTtl: retryBaseDelayMs,
  });
  await channel.bindQueue(retryQueue, retryExchange, queueName);

  await channel.assertQueue(queueName, {
    durable: options.durable ?? true,
    ...options,
    arguments: {
      ...(options.arguments ?? {}),
      'x-dead-letter-exchange': retryExchange,
      'x-dead-letter-routing-key': queueName,
    },
  });
};
