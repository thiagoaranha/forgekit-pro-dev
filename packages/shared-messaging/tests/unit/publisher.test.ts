import { describe, it, expect, vi } from 'vitest';
import type { ConfirmChannel } from 'amqplib';

import { publishMessage } from '../../src/publisher.js';

vi.mock('@forgekit/shared-observability', () => ({
  logger: { warn: vi.fn() },
  withDependencyTelemetry: async (name: string, attrs: any, fn: any) => fn(),
  injectObservabilityHeaders: (headers: any) => headers,
  getCorrelationId: () => 'corr-123',
  getTraceId: () => 'trace-456',
  getTraceContext: () => 'trace-context',
}));

const createMockChannel = () => {
  return {
    publish: vi.fn().mockReturnValue(true),
    waitForConfirms: vi.fn().mockResolvedValue(undefined),
  } as unknown as ConfirmChannel;
};

describe('publishMessage', () => {
  it('should publish message as JSON buffer and wait for confirms', async () => {
    const channel = createMockChannel();
    const payload = { data: 'test' };
    
    await publishMessage(channel, 'test-exchange', 'test-routing-key', payload, {
      correlationId: 'corr-123',
      traceparent: 'trace-456',
    });
    
    expect(channel.publish).toHaveBeenCalledWith(
      'test-exchange',
      'test-routing-key',
      expect.any(Buffer),
      expect.objectContaining({
        contentType: 'application/json',
        headers: expect.objectContaining({
          'x-correlation-id': 'corr-123',
          'traceparent': 'trace-context',
        })
      })
    );
    expect(channel.waitForConfirms).toHaveBeenCalled();
  });

  it('should serialize payload correctly', async () => {
    const channel = createMockChannel();
    const payload = { test: 123 };
    
    await publishMessage(channel, 'test-exchange', 'test.key', payload, { correlationId: 'c1' });
    
    const bufferArg = (channel.publish as any).mock.calls[0][2] as Buffer;
    expect(bufferArg.toString('utf8')).toBe('{"test":123}');
  });
});
