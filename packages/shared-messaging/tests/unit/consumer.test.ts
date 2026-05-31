import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';

import { subscribeQueue } from '../../src/consumer';
import { NonRetryableError } from '../../src/retry-policy';

vi.mock('@forgekit/shared-observability', () => ({
  extractObservabilityContextFromHeaders: () => ({ correlationId: '123', traceparent: '456' }),
  runWithObservabilityContext: async (ctx: any, fn: any) => fn(),
  withMessageTelemetry: async (name: string, attrs: any, fn: any) => fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../src/messaging-metrics', () => ({
  messagingConsumedTotal: { labels: () => ({ inc: vi.fn() }) },
  messagingConsumerErrorsTotal: { labels: () => ({ inc: vi.fn() }) },
  messagingDlqTotal: { labels: () => ({ inc: vi.fn() }) },
  messagingProcessingDurationSeconds: { labels: () => ({ observe: vi.fn() }) },
}));

const createMockChannel = () => {
  return {
    prefetch: vi.fn(),
    consume: vi.fn(),
    ack: vi.fn(),
    nack: vi.fn(),
    publish: vi.fn(),
    waitForConfirms: vi.fn().mockResolvedValue(undefined),
  } as unknown as ConfirmChannel;
};

const createMockMessage = (content: string, headers: Record<string, any> = {}, contentType = 'application/json') => {
  return {
    content: Buffer.from(content),
    properties: {
      headers,
      contentType,
    },
  } as ConsumeMessage;
};

describe('subscribeQueue', () => {
  const defaultClientOptions = { url: 'amqp://localhost', serviceName: 'test-svc' };

  it('should process a valid message successfully', async () => {
    const channel = createMockChannel();
    const handler = vi.fn().mockResolvedValue(undefined);
    
    await subscribeQueue(channel, 'test-queue', handler, {}, defaultClientOptions);
    
    const consumeCallback = (channel.consume as any).mock.calls[0][1];
    const message = createMockMessage('{"data":"valid"}');
    
    await consumeCallback(message);
    
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0]).toEqual({ data: 'valid' });
    expect(channel.ack).toHaveBeenCalledWith(message);
  });

  it('should handle prefetch option', async () => {
    const channel = createMockChannel();
    const handler = vi.fn().mockResolvedValue(undefined);
    
    await subscribeQueue(channel, 'test-queue', handler, { prefetch: 10 }, defaultClientOptions);
    
    expect(channel.prefetch).toHaveBeenCalledWith(10);
  });

  it('should ignore null messages (broker cancellation)', async () => {
    const channel = createMockChannel();
    const handler = vi.fn().mockResolvedValue(undefined);
    
    await subscribeQueue(channel, 'test-queue', handler, {}, defaultClientOptions);
    
    const consumeCallback = (channel.consume as any).mock.calls[0][1];
    
    await consumeCallback(null);
    
    expect(handler).not.toHaveBeenCalled();
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('should reject invalid JSON directly to DLQ as NonRetryableError', async () => {
    const channel = createMockChannel();
    const handler = vi.fn().mockResolvedValue(undefined);
    
    await subscribeQueue(channel, 'test-queue', handler, {}, defaultClientOptions);
    
    const consumeCallback = (channel.consume as any).mock.calls[0][1];
    const message = createMockMessage('{invalid json}');
    
    await consumeCallback(message);
    
    expect(handler).not.toHaveBeenCalled();
    expect(channel.publish).toHaveBeenCalledWith('', 'test-queue.dlq', message.content, expect.any(Object));
    expect(channel.waitForConfirms).toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('should reject when requireJsonContentType is true and content type is not application/json', async () => {
    const channel = createMockChannel();
    const handler = vi.fn().mockResolvedValue(undefined);
    
    await subscribeQueue(channel, 'test-queue', handler, { requireJsonContentType: true }, defaultClientOptions);
    
    const consumeCallback = (channel.consume as any).mock.calls[0][1];
    const message = createMockMessage('{"data":"valid"}', {}, 'text/plain');
    
    await consumeCallback(message);
    
    expect(handler).not.toHaveBeenCalled();
    expect(channel.publish).toHaveBeenCalledWith('', 'test-queue.dlq', message.content, expect.any(Object));
    expect(channel.waitForConfirms).toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledWith(message);
  });

  it('should nack without requeue for standard handler errors (retryable)', async () => {
    const channel = createMockChannel();
    const handler = vi.fn().mockRejectedValue(new Error('Temporary failure'));
    
    await subscribeQueue(channel, 'test-queue', handler, {}, defaultClientOptions);
    
    const consumeCallback = (channel.consume as any).mock.calls[0][1];
    const message = createMockMessage('{"data":"valid"}');
    
    await consumeCallback(message);
    
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
    expect(channel.publish).not.toHaveBeenCalled();
  });

  it('should publish to DLQ when retry is exhausted', async () => {
    const channel = createMockChannel();
    const handler = vi.fn().mockRejectedValue(new Error('Persistent failure'));
    
    await subscribeQueue(channel, 'test-queue', handler, {}, defaultClientOptions);
    
    const consumeCallback = (channel.consume as any).mock.calls[0][1];
    const message = createMockMessage('{"data":"valid"}', {
      'x-death': [{ queue: 'test-queue', count: 3 }] // exhausted (default maxAttempts is 3)
    });
    
    await consumeCallback(message);
    
    expect(channel.nack).not.toHaveBeenCalled();
    expect(channel.publish).toHaveBeenCalledWith('', 'test-queue.dlq', message.content, expect.any(Object));
    expect(channel.waitForConfirms).toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledWith(message);
  });

  it('should run validate callback and pass result to handler', async () => {
    const channel = createMockChannel();
    const handler = vi.fn().mockResolvedValue(undefined);
    const validate = vi.fn().mockReturnValue({ data: 'validated' });
    
    await subscribeQueue(channel, 'test-queue', handler, { validate }, defaultClientOptions);
    
    const consumeCallback = (channel.consume as any).mock.calls[0][1];
    const message = createMockMessage('{"data":"valid"}');
    
    await consumeCallback(message);
    
    expect(validate).toHaveBeenCalledWith({ data: 'valid' });
    expect(handler).toHaveBeenCalledWith({ data: 'validated' }, expect.any(Object));
  });

  it('should publish to DLQ if validate throws', async () => {
    const channel = createMockChannel();
    const handler = vi.fn().mockResolvedValue(undefined);
    const validate = vi.fn().mockImplementation(() => { throw new Error('Validation failed'); });
    
    await subscribeQueue(channel, 'test-queue', handler, { validate }, defaultClientOptions);
    
    const consumeCallback = (channel.consume as any).mock.calls[0][1];
    const message = createMockMessage('{"data":"valid"}');
    
    await consumeCallback(message);
    
    expect(handler).not.toHaveBeenCalled();
    expect(channel.publish).toHaveBeenCalledWith('', 'test-queue.dlq', message.content, expect.objectContaining({
      headers: expect.objectContaining({
        'x-dlq-reason': 'Payload validation failed: Validation failed'
      })
    }));
    expect(channel.waitForConfirms).toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledWith(message);
  });
});
