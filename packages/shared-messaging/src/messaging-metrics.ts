import { Counter, Histogram, register } from 'prom-client';

const getOrCreateCounter = (
  name: string,
  help: string,
  labelNames: ReadonlyArray<string>
): Counter<string> => {
  const existing = register.getSingleMetric(name);
  if (existing) {
    return existing as Counter<string>;
  }

  return new Counter({ name, help, labelNames });
};

const getOrCreateHistogram = (
  name: string,
  help: string,
  labelNames: ReadonlyArray<string>
): Histogram<string> => {
  const existing = register.getSingleMetric(name);
  if (existing) {
    return existing as Histogram<string>;
  }

  return new Histogram({
    name,
    help,
    labelNames,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  });
};

export const messagingPublishedTotal = getOrCreateCounter(
  'messaging_published_total',
  'Total published messages.',
  ['service', 'exchange', 'routing_key']
);

export const messagingConsumedTotal = getOrCreateCounter(
  'messaging_consumed_total',
  'Total consumed messages.',
  ['service', 'queue', 'outcome']
);

export const messagingConsumerErrorsTotal = getOrCreateCounter(
  'messaging_consumer_errors_total',
  'Total consumer errors.',
  ['service', 'queue', 'error_type']
);

export const messagingDlqTotal = getOrCreateCounter(
  'messaging_dlq_total',
  'Total messages sent to DLQ.',
  ['service', 'queue', 'reason']
);

export const messagingProcessingDurationSeconds = getOrCreateHistogram(
  'messaging_processing_duration_seconds',
  'Message processing duration in seconds.',
  ['service', 'queue', 'outcome']
);

/**
 * Normalized error type for consumer error metrics.
 * Must be one of the allowed low-cardinality values per FR-024a.
 */
export type ConsumerErrorType =
  | 'handler_error'
  | 'invalid_json'
  | 'invalid_content_type'
  | 'validation_failed'
  | 'unknown';

/**
 * Normalized DLQ reason for DLQ metrics.
 * Must be one of the allowed low-cardinality values per FR-024a.
 */
export type DlqReason =
  | 'retry_exhausted'
  | 'non_retryable'
  | 'invalid_json'
  | 'invalid_content_type'
  | 'validation_failed';
