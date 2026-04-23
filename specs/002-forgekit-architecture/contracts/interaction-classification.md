# Interaction Classification Contract

## Purpose
Standardize how teams choose communication patterns and define minimum resilience behavior.

## 1) Classification Decision Matrix

### Use `sync-http` when
- Caller requires immediate request/response feedback.
- Interaction is internal or gateway-routed and does not require binary streaming performance.
- Contract can be safely represented in HTTP semantics.

### Use `sync-grpc` when
- Immediate feedback is required.
- Interaction is internal only.
- Low-latency and strongly typed contracts are explicit requirements.

### Use `async-queue` when
- A single consumer is responsible for processing a task/command.
- Work distribution or load balancing is required.
- Exactly one logical handler should complete the unit of work.

### Use `async-pubsub` when
- Multiple independent consumers must react to one domain event.
- Producer and consumers must evolve with loose coupling.
- Event represents domain-level state change.

## 2) Synchronous Timeout Classes

### Timeout defaults
- `internal-read`: connect timeout `1s`, request timeout `3s`
- `internal-write`: connect timeout `1s`, request timeout `3s`
- `external-dependency`: connect timeout `1s`, request timeout `5s`

### Hard limit
- Any synchronous interaction must not exceed `10s` total timeout unless architecture exception is approved.

## 3) Retry and Dead Letter Policy (Asynchronous)

### Failure classification
- Every consumer classifies failures as `retryable` or `non-retryable`.

### Retryable failures
- Must use exponential backoff with jitter.
- Maximum retry attempts: `3`.
- On exhaustion, route to DLQ.

### Non-retryable failures
- Must bypass retries.
- Must route directly to DLQ or equivalent failure channel.

### Consumer behavior
- Consumers must be idempotent for at-least-once delivery.

## 4) Required Review Inputs

For each interaction proposal include:
- Source service and target (service or broker).
- Selected pattern (`sync-http`, `sync-grpc`, `async-queue`, `async-pubsub`).
- Immediate-feedback rationale.
- Timeout class and values (for sync).
- Failure classification and retry/DLQ behavior (for async).
- Correlation ID propagation strategy.

## 5) Decision Output

Reviewer marks one status per interaction:
- `compliant`
- `compliant-with-conditions`
- `non-compliant`

`non-compliant` interactions must be redesigned before implementation approval.
