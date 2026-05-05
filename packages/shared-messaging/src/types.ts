import type { ReadinessCheck } from '@forgekit/shared-observability';
import type { IdentityContext } from '@forgekit/shared-security';
import type { ConsumeMessage, Options } from 'amqplib';

export type MessagingClientOptions = {
  url: string;
  serviceName: string;
  reconnect?: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  };
  retry?: {
    maxAttempts?: number;
    baseDelayMs?: number;
  };
};

export type PublishOptions = {
  persistent?: boolean;
  headers?: Record<string, unknown>;
};

export type SubscribeOptions = {
  prefetch?: number;
  noAck?: boolean;
};

export type AssertQueueOptions = Options.AssertQueue & {
  enableDlq?: boolean;
};

export type MessageMetadata = {
  correlationId: string;
  traceparent: string;
  retryCount: number;
  identity: IdentityContext;
  headers: Record<string, unknown>;
  rawMessage: ConsumeMessage;
};

export type MessageHandler<T> = (payload: T, metadata: MessageMetadata) => Promise<void> | void;

export interface MessagingClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  assertExchange(name: string, type?: string): Promise<void>;
  assertQueue(name: string, options?: AssertQueueOptions): Promise<void>;
  bindQueue(queue: string, exchange: string, routingKey: string): Promise<void>;
  publish<T>(exchange: string, routingKey: string, payload: T, options?: PublishOptions): Promise<void>;
  subscribe<T>(queue: string, handler: MessageHandler<T>, options?: SubscribeOptions): Promise<void>;
  healthCheck(): ReadinessCheck;
}
