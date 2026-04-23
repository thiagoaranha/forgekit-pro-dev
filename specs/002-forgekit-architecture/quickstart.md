# ForgeKit Architecture Review Quickstart

Use this guide before implementing a new service or cross-service interaction.

## 1) Prepare Inputs
- Read `spec.md` for mandatory architecture rules.
- Fill service and interaction details using:
  - `contracts/architecture-review.md`
  - `contracts/interaction-classification.md`

## 2) Run Service Boundary Review
- Declare service responsibility and owned data stores.
- Confirm there is no direct cross-service database access.
- List all external integration contracts (APIs/events).

Expected outcome:
- Service boundary decision is `pass` or flagged with explicit conditions.

## 3) Classify Each Interaction
- Decide if immediate response is required.
- Select one pattern:
  - `sync-http`
  - `sync-grpc`
  - `async-queue`
  - `async-pubsub`
- Apply timeout classes for sync interactions.
- Apply retry/DLQ policy for async interactions.

Expected outcome:
- Each interaction has a compliant classification and resilience profile.

## 4) Validate Security and Observability
- Ensure identity propagation includes:
  - `x-user-id`
  - `x-user-roles`
  - `x-user-permissions`
- Ensure correlation ID continuity across all hops.
- Ensure no sensitive data is exposed in logs/events.

Expected outcome:
- Identity and traceability checks are complete and reviewable.

## 5) Record Review Decision
- Produce one approval record per architecture review:
  - `approved`
  - `approved-with-conditions`
  - `rejected`
- Attach required follow-ups for conditional approvals.

## Example Classifications

### Example A: Synchronous interaction
- Scenario: Gateway requests current account balance from Account Service.
- Classification: `sync-http`.
- Rationale: Immediate response required for user-facing flow.
- Timeout class: `internal-read` (`1s` connect, `3s` request).

### Example B: Asynchronous interaction
- Scenario: Order Service emits `order.completed` event consumed by Billing and Notification services.
- Classification: `async-pubsub`.
- Rationale: Multiple independent consumers react to one domain state change.
- Reliability: retryable failures use up to 3 retries with backoff+jitter, then DLQ.
