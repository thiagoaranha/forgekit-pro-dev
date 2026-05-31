import { logger } from '@forgekit/shared-observability';
import amqp, { type ChannelModel, type ConfirmChannel } from 'amqplib';

import type { MessagingClientOptions } from './types.js';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class ConnectionManager {
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private connecting?: Promise<void>;
  private reconnecting = false;

  constructor(private readonly options: MessagingClientOptions) {}

  async connect(): Promise<void> {
    if (this.connection) {
      return;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = this.connectWithRetry();
    await this.connecting;
    this.connecting = undefined;
  }

  async getChannel(): Promise<ConfirmChannel> {
    await this.connect();

    if (!this.connection) {
      throw new Error('AMQP connection unavailable');
    }

    if (!this.channel) {
      this.channel = await this.connection.createConfirmChannel();
    }

    return this.channel;
  }

  isConnected(): boolean {
    return Boolean(this.connection);
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = undefined;
    }

    if (this.connection) {
      await this.connection.close();
      this.connection = undefined;
    }
  }

  private async connectWithRetry(): Promise<void> {
    const maxAttempts = this.options.reconnect?.maxAttempts ?? 10;
    const baseDelayMs = this.options.reconnect?.baseDelayMs ?? 1000;
    const maxDelayMs = this.options.reconnect?.maxDelayMs ?? 30_000;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        this.connection = await amqp.connect(this.options.url);
        this.attachConnectionHandlers();
        logger.info({ attempt }, 'Messaging broker connected');
        return;
      } catch (error) {
        const expDelay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
        const jitter = Math.floor(Math.random() * Math.floor(expDelay * 0.2));
        const delay = expDelay + jitter;
        logger.warn({ err: error, attempt, delay }, 'Messaging broker connection failed, retrying');
        await sleep(delay);
      }
    }

    logger.error({ attempts: maxAttempts }, 'Messaging broker connection failed permanently');
    throw new Error('Unable to connect to messaging broker');
  }

  private attachConnectionHandlers(): void {
    if (!this.connection) {
      return;
    }

    this.connection.on('error', (error) => {
      logger.warn({ err: error }, 'Messaging connection error');
    });

    this.connection.on('close', () => {
      logger.warn('Messaging connection closed');
      this.connection = undefined;
      this.channel = undefined;
      void this.reconnect();
    });
  }

  private async reconnect(): Promise<void> {
    if (this.reconnecting) {
      return;
    }

    this.reconnecting = true;
    try {
      logger.info('Messaging reconnecting');
      await this.connect();
      logger.info('Messaging reconnected');
    } finally {
      this.reconnecting = false;
    }
  }
}
