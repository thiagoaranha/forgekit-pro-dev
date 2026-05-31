import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import amqp from 'amqplib';

import { ConnectionManager } from '../../src/connection-manager.js';

vi.mock('amqplib', () => {
  return {
    default: {
      connect: vi.fn(),
    }
  };
});

vi.mock('@forgekit/shared-observability', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const createMockConnection = () => {
  return {
    createConfirmChannel: vi.fn().mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
    }),
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
};

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ConnectionManager({ url: 'amqp://test', serviceName: 'test-svc', reconnect: { maxAttempts: 1, baseDelayMs: 1 } });
  });

  afterEach(async () => {
    await manager.disconnect();
  });

  it('should connect successfully', async () => {
    const mockConn = createMockConnection();
    vi.mocked(amqp.connect).mockResolvedValueOnce(mockConn as any);

    await manager.connect();

    expect(amqp.connect).toHaveBeenCalledWith('amqp://test');
    expect(manager.isConnected()).toBe(true);
  });

  it('should fail to connect after max attempts', async () => {
    vi.mocked(amqp.connect).mockRejectedValue(new Error('Connection refused'));

    await expect(manager.connect()).rejects.toThrow('Unable to connect to messaging broker');
    expect(manager.isConnected()).toBe(false);
  });

  it('should not reconnect if already connected', async () => {
    const mockConn = createMockConnection();
    vi.mocked(amqp.connect).mockResolvedValueOnce(mockConn as any);

    await manager.connect();
    await manager.connect(); // second call

    expect(amqp.connect).toHaveBeenCalledTimes(1);
  });

  it('should create and cache channel', async () => {
    const mockConn = createMockConnection();
    vi.mocked(amqp.connect).mockResolvedValueOnce(mockConn as any);

    const channel1 = await manager.getChannel();
    const channel2 = await manager.getChannel();

    expect(mockConn.createConfirmChannel).toHaveBeenCalledTimes(1);
    expect(channel1).toBe(channel2);
  });

  it('should close connection and channel on disconnect', async () => {
    const mockConn = createMockConnection();
    vi.mocked(amqp.connect).mockResolvedValueOnce(mockConn as any);

    const channel = await manager.getChannel();
    await manager.disconnect();

    expect(channel.close).toHaveBeenCalled();
    expect(mockConn.close).toHaveBeenCalled();
    expect(manager.isConnected()).toBe(false);
  });

  it('should handle connection error event', async () => {
    const mockConn = createMockConnection();
    let errorCallback: any;
    mockConn.on.mockImplementation((event, cb) => {
      if (event === 'error') errorCallback = cb;
    });
    vi.mocked(amqp.connect).mockResolvedValueOnce(mockConn as any);

    await manager.connect();
    expect(errorCallback).toBeDefined();
    errorCallback(new Error('test error'));
    
    // Test passes if no exception is thrown
  });

  it('should handle connection close event and reconnect', async () => {
    const mockConn = createMockConnection();
    let closeCallback: any;
    mockConn.on.mockImplementation((event, cb) => {
      if (event === 'close') closeCallback = cb;
    });
    vi.mocked(amqp.connect).mockResolvedValue(mockConn as any); // allow reconnect to succeed

    await manager.connect();
    expect(closeCallback).toBeDefined();
    
    // Trigger close
    await closeCallback();
    
    // Reconnect should have been called
    expect(amqp.connect).toHaveBeenCalledTimes(2);
  });
});
