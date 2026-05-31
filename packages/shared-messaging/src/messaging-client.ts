import type { ReadinessCheck } from '@forgekit/shared-observability';

import { ConnectionManager } from './connection-manager.js';
import { messagingPublishedTotal } from './messaging-metrics.js';
import { publishMessage } from './publisher.js';
import { assertQueueWithDlq } from './retry-policy.js';
import { subscribeQueue } from './consumer.js';
import type {
  AssertQueueOptions,
  MessageHandler,
  MessagingClient,
  MessagingClientOptions,
  PublishOptions,
  SubscribeOptions,
} from './types.js';

class MessagingClientImpl implements MessagingClient {
  private readonly connectionManager: ConnectionManager;

  constructor(private readonly options: MessagingClientOptions) {
    this.connectionManager = new ConnectionManager(options);
  }

  async connect(): Promise<void> {
    await this.connectionManager.connect();
  }

  async disconnect(): Promise<void> {
    await this.connectionManager.disconnect();
  }

  async assertExchange(name: string, type = 'topic'): Promise<void> {
    const channel = await this.connectionManager.getChannel();
    await channel.assertExchange(name, type, { durable: true });
  }

  async assertQueue(name: string, options: AssertQueueOptions = {}): Promise<void> {
    const channel = await this.connectionManager.getChannel();
    await assertQueueWithDlq(channel, name, options, this.options.retry?.delayMs ?? 1000);
  }

  async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
    const channel = await this.connectionManager.getChannel();
    await channel.bindQueue(queue, exchange, routingKey);
  }

  async publish<T>(exchange: string, routingKey: string, payload: T, options: PublishOptions = {}): Promise<void> {
    const channel = await this.connectionManager.getChannel();
    await publishMessage(channel, exchange, routingKey, payload, options);
    messagingPublishedTotal.labels(this.options.serviceName, exchange, routingKey).inc();
  }

  async subscribe<T>(queue: string, handler: MessageHandler<T>, options: SubscribeOptions<T> = {}): Promise<void> {
    const channel = await this.connectionManager.getChannel();
    await subscribeQueue(channel, queue, handler, options, this.options);
  }

  healthCheck(): ReadinessCheck {
    return {
      name: 'rabbitmq',
      check: async () => {
        if (!this.connectionManager.isConnected()) {
          throw new Error('Messaging broker is disconnected');
        }
        return true;
      },
    };
  }
}

export const createMessagingClient = (options: MessagingClientOptions): MessagingClient =>
  new MessagingClientImpl(options);
