import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConfirmChannel } from 'amqplib';

import { createMessagingClient } from '../../src/messaging-client';
import { ConnectionManager } from '../../src/connection-manager';
import type { MessagingClient } from '../../src/types';

vi.mock('../../src/connection-manager', () => {
  return {
    ConnectionManager: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
      getChannel: vi.fn().mockResolvedValue({
        assertExchange: vi.fn().mockResolvedValue(undefined),
        bindQueue: vi.fn().mockResolvedValue(undefined),
      } as unknown as ConfirmChannel),
    })),
  };
});

vi.mock('../../src/retry-policy', () => ({
  assertQueueWithDlq: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/publisher', () => ({
  publishMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/consumer', () => ({
  subscribeQueue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@forgekit/shared-observability', () => ({
  getCorrelationId: () => 'corr-123',
  getTraceId: () => 'trace-456',
  getIdentityContext: () => ({ userId: 'user-1' }),
}));

vi.mock('../../src/messaging-metrics', () => ({
  messagingPublishedTotal: { labels: () => ({ inc: vi.fn() }) },
}));

describe('createMessagingClient', () => {
  const options = { url: 'amqp://localhost', serviceName: 'test-svc' };
  let client: MessagingClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createMessagingClient(options);
  });

  it('should initialize ConnectionManager', () => {
    expect(ConnectionManager).toHaveBeenCalledWith(options);
  });

  it('should connect via ConnectionManager', async () => {
    await client.connect();
    expect((client as any).connectionManager.connect).toHaveBeenCalled();
  });

  it('should disconnect via ConnectionManager', async () => {
    await client.disconnect();
    expect((client as any).connectionManager.disconnect).toHaveBeenCalled();
  });

  it('should assert exchange', async () => {
    await client.assertExchange('test-exchange');
    const channel = await (client as any).connectionManager.getChannel();
    expect(channel.assertExchange).toHaveBeenCalledWith('test-exchange', 'topic', expect.any(Object));
  });

  it('should bind queue', async () => {
    await client.bindQueue('q1', 'ex1', 'rk1');
    const channel = await (client as any).connectionManager.getChannel();
    expect(channel.bindQueue).toHaveBeenCalledWith('q1', 'ex1', 'rk1');
  });

  it('should return health check status based on connection', async () => {
    const health = client.healthCheck();
    expect(health.name).toBe('rabbitmq');
    const result = await health.check();
    expect(result).toBe(true); // since isConnected mock returns true
  });
});
