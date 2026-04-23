# Architecture Governance Data Model

This feature models architecture review artifacts, not runtime domain tables.

## 1) Service Boundary Declaration

Represents a proposed service and its ownership boundaries.

| Field | Type | Description |
|---|---|---|
| `serviceName` | String | Unique service identifier in ForgeKit. |
| `responsibility` | String | Bounded responsibility statement for the service. |
| `ownedDataStores` | String[] | Data stores exclusively owned by the service. |
| `externalContracts` | String[] | Published APIs/events used for cross-service integration. |
| `prohibitedAccessConfirmed` | Boolean | Confirms no direct access to another service database. |

## 2) Interaction Declaration

Represents one cross-service interaction under review.

| Field | Type | Description |
|---|---|---|
| `interactionId` | String | Unique interaction identifier within review scope. |
| `sourceService` | String | Service initiating the interaction. |
| `targetType` | Enum | `service` or `broker`. |
| `pattern` | Enum | `sync-http`, `sync-grpc`, `async-queue`, `async-pubsub`. |
| `immediateFeedbackRequired` | Boolean | Whether caller requires immediate response semantics. |
| `timeoutClass` | Enum | `internal-read`, `internal-write`, `external-dependency`, `not-applicable`. |
| `failureContainment` | String | Strategy for graceful degradation and cascade prevention. |

## 3) Event Contract Declaration

Represents a domain event schema and governance metadata.

| Field | Type | Description |
|---|---|---|
| `eventName` | String | Domain outcome name (e.g., `order.completed`). |
| `producerService` | String | Service owning and producing the event. |
| `schemaVersion` | String | Version identifier for compatibility tracking. |
| `compatibilityMode` | Enum | `backward-compatible`, `breaking-change`. |
| `consumerExpectations` | String[] | Consumer handling assumptions and constraints. |
| `governanceReviewRequired` | Boolean | True for breaking changes or policy-triggered changes. |
| `migrationStrategyRef` | String | Reference to migration plan when needed. |

## 4) Reliability Policy Declaration

Represents event failure-handling behavior.

| Field | Type | Description |
|---|---|---|
| `failureClass` | Enum | `retryable` or `non-retryable`. |
| `maxRetryAttempts` | Integer | Maximum retries before terminal routing (default: 3). |
| `retryStrategy` | String | Exponential backoff with jitter parameters. |
| `dlqDestination` | String | Dead-letter queue or failure channel name. |
| `idempotencyStrategy` | String | Duplicate-delivery safety mechanism summary. |

## 5) Compliance Evidence Record

Represents traceable evidence for architecture approval.

| Field | Type | Description |
|---|---|---|
| `reviewId` | String | Architecture review identifier. |
| `serviceBoundaryRef` | String | Reference to service boundary declaration. |
| `interactionRefs` | String[] | References to reviewed interactions. |
| `eventContractRefs` | String[] | References to event contracts in scope. |
| `identityPropagationValidated` | Boolean | Confirms required identity claims propagation. |
| `correlationIdValidated` | Boolean | Confirms correlation ID end-to-end continuity. |
| `decision` | Enum | `approved`, `approved-with-conditions`, `rejected`. |
| `decisionNotes` | String | Reviewer rationale and required follow-ups. |
