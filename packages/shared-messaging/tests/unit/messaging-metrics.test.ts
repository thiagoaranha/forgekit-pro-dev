import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register } from 'prom-client';

import {
  messagingPublishedTotal,
  messagingConsumedTotal,
  messagingConsumerErrorsTotal,
  messagingDlqTotal,
  messagingProcessingDurationSeconds,
} from '../../src/messaging-metrics';

describe('Messaging Metrics', () => {
  beforeEach(() => {
    register.clear();
  });

  it('should create and export messagingPublishedTotal counter', () => {
    expect(messagingPublishedTotal).toBeDefined();
    expect(messagingPublishedTotal.name).toBe('messaging_published_total');
  });

  it('should create and export messagingConsumedTotal counter', () => {
    expect(messagingConsumedTotal).toBeDefined();
    expect(messagingConsumedTotal.name).toBe('messaging_consumed_total');
  });

  it('should create and export messagingConsumerErrorsTotal counter', () => {
    expect(messagingConsumerErrorsTotal).toBeDefined();
    expect(messagingConsumerErrorsTotal.name).toBe('messaging_consumer_errors_total');
  });

  it('should create and export messagingDlqTotal counter', () => {
    expect(messagingDlqTotal).toBeDefined();
    expect(messagingDlqTotal.name).toBe('messaging_dlq_total');
  });

  it('should create and export messagingProcessingDurationSeconds histogram', () => {
    expect(messagingProcessingDurationSeconds).toBeDefined();
    expect(messagingProcessingDurationSeconds.name).toBe('messaging_processing_duration_seconds');
  });
});
