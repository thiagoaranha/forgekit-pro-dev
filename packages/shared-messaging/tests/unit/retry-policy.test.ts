import { describe, it, expect, vi } from 'vitest';

import { NonRetryableError, parseRetryCount, isRetryExhausted } from '../../src/retry-policy.js';
import type { ConsumeMessage } from 'amqplib';
import amqplib from 'amqplib';

describe('NonRetryableError', () => {
  it('should be an instance of Error', () => {
    const error = new NonRetryableError('test message');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NonRetryableError');
    expect(error.message).toBe('test message');
  });
});

describe('parseRetryCount', () => {
  it('should return 0 when x-death header is missing', () => {
    const message = { properties: { headers: {} } } as ConsumeMessage;
    expect(parseRetryCount(message, 'test-queue')).toBe(0);
  });

  it('should return 0 when x-death is not an array', () => {
    const message = { properties: { headers: { 'x-death': 'not-an-array' } } } as unknown as ConsumeMessage;
    expect(parseRetryCount(message, 'test-queue')).toBe(0);
  });

  it('should return 0 when no entry matches the queue name', () => {
    const message = {
      properties: {
        headers: {
          'x-death': [{ queue: 'other-queue', count: 5 }],
        },
      },
    } as unknown as ConsumeMessage;
    expect(parseRetryCount(message, 'test-queue')).toBe(0);
  });

  it('should return the count for the matching queue', () => {
    const message = {
      properties: {
        headers: {
          'x-death': [{ queue: 'test-queue', count: 3 }],
        },
      },
    } as unknown as ConsumeMessage;
    expect(parseRetryCount(message, 'test-queue')).toBe(3);
  });
});

describe('isRetryExhausted', () => {
  it('should return true when count equals maxAttempts', () => {
    const message = {
      properties: {
        headers: {
          'x-death': [{ queue: 'test-queue', count: 3 }],
        },
      },
    } as unknown as ConsumeMessage;
    expect(isRetryExhausted(message, 'test-queue', 3)).toBe(true);
  });

  it('should return true when count exceeds maxAttempts', () => {
    const message = {
      properties: {
        headers: {
          'x-death': [{ queue: 'test-queue', count: 4 }],
        },
      },
    } as unknown as ConsumeMessage;
    expect(isRetryExhausted(message, 'test-queue', 3)).toBe(true);
  });

  it('should return false when count is less than maxAttempts', () => {
    const message = {
      properties: {
        headers: {
          'x-death': [{ queue: 'test-queue', count: 2 }],
        },
      },
    } as unknown as ConsumeMessage;
    expect(isRetryExhausted(message, 'test-queue', 3)).toBe(false);
  });

  it('should return false when no x-death header is present (count = 0)', () => {
    const message = { properties: { headers: {} } } as ConsumeMessage;
    expect(isRetryExhausted(message, 'test-queue', 3)).toBe(false);
  });
});

describe('assertQueueWithDlq', () => {
  it('should assert main queue, DLQ, and retry topology', async () => {
    const channel = {
      assertExchange: vi.fn().mockResolvedValue(undefined),
      assertQueue: vi.fn().mockResolvedValue(undefined),
      bindQueue: vi.fn().mockResolvedValue(undefined),
    } as unknown as amqplib.Channel;

    const { assertQueueWithDlq } = await import('../../src/retry-policy');

    await assertQueueWithDlq(channel, 'test-queue', {}, 2000);

    expect(channel.assertQueue).toHaveBeenCalledWith('test-queue.dlq', expect.objectContaining({ durable: true }));
    expect(channel.assertExchange).toHaveBeenCalledWith('test-queue.retry.exchange', 'direct', expect.any(Object));
    expect(channel.assertQueue).toHaveBeenCalledWith('test-queue.retry', expect.objectContaining({
      deadLetterExchange: '',
      deadLetterRoutingKey: 'test-queue',
      messageTtl: 2000,
    }));
    expect(channel.bindQueue).toHaveBeenCalledWith('test-queue.retry', 'test-queue.retry.exchange', 'test-queue');
    expect(channel.assertQueue).toHaveBeenCalledWith('test-queue', expect.objectContaining({
      arguments: expect.objectContaining({
        'x-dead-letter-exchange': 'test-queue.retry.exchange',
        'x-dead-letter-routing-key': 'test-queue',
      }),
    }));
  });
});
