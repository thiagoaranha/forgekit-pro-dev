# Feature Specification: ForgeKit Shared Abstractions

**Feature Branch**: `feat/010-shared-abstractions`
**Created**: 2026-05-04
**Status**: Approved
**Input**: User description: "Create shared libraries to standardize messaging (RabbitMQ), security (identity headers), and error handling across all ForgeKit services."

## Overview

ForgeKit services already share observability (`@forgekit/shared-observability`) and environment parsing (`@forgekit/shared-tooling`). However, three critical cross-cutting concerns are still implemented ad-hoc in each service:

1. **Messaging** — Services use raw `amqplib` calls, manually managing connections, channels, exchange/queue topology, retry logic, DLQ routing, and correlation ID propagation.
2. **Identity / Security** — Services read gateway-injected headers (`x-forgekit-user-id`, `x-forgekit-role`) with inline string access, without validation or a typed context.
3. **Error Handling** — Services construct error responses with inconsistent structures, violating the standardized contract required by Spec 003 FR-062.

This specification defines three new shared packages — `@forgekit/shared-messaging`, `@forgekit/shared-security`, and `@forgekit/shared-error-handling` — that eliminate this inconsistency and reduce boilerplate across every ForgeKit service.

### Design Principles

- **Thin wrappers, not frameworks**: Each package encapsulates exactly one cross-cutting concern with a minimal, typed API surface. Services remain in control of their domain logic.
- **Observable by default**: Every abstraction integrates with `@forgekit/shared-observability` for correlation IDs, structured logging, tracing spans, and metrics — without requiring manual wiring.
- **Fail-fast, fail-safe**: Connection failures, missing headers, and malformed payloads are detected immediately with clear diagnostics. Transient failures are retried with bounded backoff.
- **Technology-specific, contract-agnostic**: The current implementation targets RabbitMQ and Fastify, matching the ForgeKit reference stack. The behavioral contracts (retry policies, identity semantics, error structures) are defined independently so that future runtime swaps remain feasible.

### Traceability to Existing Specs

| Concern | Spec 002 (Architecture) | Spec 003 (Service Standards) | Spec 008 (Observability) |
|---|---|---|---|
| Messaging | FR-011..FR-029, FR-056..FR-061 | FR-038..FR-042 | FR-011, FR-052..FR-055 |
| Identity / Security | FR-035..FR-039, FR-062..FR-064 | FR-044..FR-046 | — |
| Error Handling | FR-040 | FR-023..FR-026, FR-062, FR-066 | FR-017, FR-069..FR-073 |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Publish and Consume Messages with Zero Boilerplate (Priority: P1)

A service developer needs to publish a domain event and consume it in another service without manually managing AMQP connections, channels, exchange topology, retry schedules, DLQ routing, or correlation ID propagation.

**Why this priority**: Raw `amqplib` usage across services is the single largest source of inconsistency, boilerplate, and reliability risk. Every service currently re-implements connection management, header injection, and error routing differently.

**Independent Test**: A reviewer can inspect a service that uses `@forgekit/shared-messaging` and confirm that publishing and consuming require fewer than 10 lines of service-specific code, that correlation IDs are propagated automatically, and that failed messages are retried and eventually routed to a DLQ.

**Acceptance Scenarios**:

1. **Given** a service publishes an event using `@forgekit/shared-messaging`, **When** the event reaches the broker, **Then** the message headers contain the current correlation ID and traceparent without any manual injection by the service developer.
2. **Given** a consumer receives a message that fails processing, **When** the retry policy is exhausted (default: 3 attempts with exponential backoff + jitter), **Then** the message is routed to a Dead Letter Queue and an error metric is incremented.
3. **Given** a broker connection is lost, **When** `@forgekit/shared-messaging` detects the disconnection, **Then** it reconnects automatically with bounded backoff and logs the reconnection lifecycle.

---

### User Story 2 — Access Identity Context Safely (Priority: P2)

A service developer needs to read the authenticated user's identity (user ID, role) from gateway-injected headers without inline string access, without trusting unvalidated values, and without coupling to specific header names.

**Why this priority**: Spec 002 FR-062/FR-063 define standardized identity headers. Hardcoding header names in every route handler creates coupling, inconsistency, and security risk when header names change (as they did during the `x-user-id` → `x-forgekit-user-id` rename).

**Independent Test**: A reviewer can inspect a service route and confirm that identity context is accessed through a typed helper or request decorator, not through raw header access.

**Acceptance Scenarios**:

1. **Given** a request arrives at a service with `x-forgekit-user-id` and `x-forgekit-role` headers, **When** the identity plugin processes the request, **Then** the handler receives a validated, typed `IdentityContext` object.
2. **Given** a request arrives without `x-forgekit-user-id`, **When** the handler attempts to access the identity, **Then** the accessor returns `undefined` (unauthenticated context) and the service can decide how to handle it.
3. **Given** a message is consumed from RabbitMQ with identity metadata in its headers, **When** `@forgekit/shared-security` extracts identity from message properties, **Then** the same `IdentityContext` type is returned, maintaining parity with HTTP identity extraction.

---

### User Story 3 — Return Consistent Error Responses (Priority: P2)

A service developer needs all error responses to follow the exact structure mandated by Spec 003 FR-062 — a stable error code, a human-readable message, and a traceable identifier — without building this structure manually in every error path.

**Why this priority**: Inconsistent error responses make API consumers unable to write reliable error-handling code. The current `example-service` already emits ad-hoc error shapes in validation failures (e.g., `{ error, issues, correlationId, traceId }`) that differ from the observability error handler's shape (e.g., `{ code, message, correlationId, traceId }`).

**Independent Test**: A reviewer can trigger validation, authorization, dependency, and unexpected errors across any service using `@forgekit/shared-error-handling` and confirm that all responses share the same JSON structure.

**Acceptance Scenarios**:

1. **Given** a service throws an `AppError` with classification `VALIDATION`, **When** the error handler processes it, **Then** the response body contains `{ code: "VALIDATION", message: <provided>, correlationId: <current>, traceId: <current> }` with HTTP status 400.
2. **Given** a service throws an unclassified `Error`, **When** the error handler processes it, **Then** the response body contains `{ code: "INTERNAL_ERROR", message: "Unexpected internal error", correlationId, traceId }` with HTTP status 500, and the original error details are logged but not exposed.
3. **Given** a service throws an `AppError` with classification `NOT_FOUND`, **When** the error handler processes it, **Then** the response uses HTTP status 404 and includes the original message without sanitization (since it is a business error, not an internal failure).

---

### Edge Cases

- What happens when a broker connection cannot be established on service startup?
- What happens when a consumer's processing callback is synchronous vs. asynchronous?
- How does the messaging library handle poison messages that cause deserialization failures before reaching business logic?
- What happens when identity headers contain unexpected types (arrays, empty strings, non-string values)?
- How does `shared-security` behave when the gateway injects additional identity claims in the future?
- What happens when an `AppError` is thrown with a custom HTTP status not covered by the default classification mapping?
- How should error details (validation issues, constraint violations) be attached without breaking the standardized response contract?

---

## Requirements *(mandatory)*

### 1. `@forgekit/shared-messaging`

#### Connection & Channel Management

- **FR-001**: The library MUST provide a `createMessagingClient` factory that accepts a connection URL (or config object) and returns a managed client instance.
- **FR-002**: The client MUST manage AMQP connections internally and MUST NOT expose raw `amqplib` connection or channel objects to consumers.
- **FR-003**: The client MUST reconnect automatically when the broker connection is lost, using exponential backoff with jitter and a configurable maximum retry count.
- **FR-004**: The client MUST log connection lifecycle events (connected, disconnected, reconnecting, reconnected, failed) using `@forgekit/shared-observability` logger.
- **FR-005**: The client MUST provide a `disconnect` method for graceful shutdown that closes channels and connections in the correct order.
- **FR-006**: The client MUST provide a health-check function compatible with the `ReadinessCheck` interface from `@forgekit/shared-observability` so services can register broker readiness.

#### Publishing

- **FR-007**: The client MUST provide a typed `publish` method accepting exchange name, routing key, payload (serializable object), and optional publish options.
- **FR-008**: The `publish` method MUST automatically inject `x-correlation-id` and `traceparent` headers from the current observability context into message properties.
- **FR-009**: The `publish` method MUST serialize the payload to JSON and set `contentType: 'application/json'`.
- **FR-010**: The `publish` method MUST use `persistent: true` by default for all published messages.
- **FR-011**: The `publish` method MUST create a tracing span of kind `PRODUCER` using `@forgekit/shared-observability`.
- **FR-012**: The client MUST provide a convenience `assertExchange` method to declare exchanges with standard defaults (`topic` type, `durable: true`).

#### Consuming

- **FR-013**: The client MUST provide a `subscribe` method accepting queue name, handler function, and optional consumer options.
- **FR-014**: The `subscribe` method MUST extract `x-correlation-id` and `traceparent` from incoming message properties/headers and restore them into the observability context before invoking the handler.
- **FR-015**: The `subscribe` method MUST deserialize JSON payloads and pass them as typed objects to the handler.
- **FR-016**: The `subscribe` method MUST wrap handler execution in `runWithObservabilityContext` and `withMessageTelemetry` from `@forgekit/shared-observability`.
- **FR-017**: The client MUST provide convenience methods to assert queues and bind them to exchanges.

#### Retry & Dead Letter Queue

- **FR-018**: The client MUST support configurable retry behavior with default values: maximum 3 attempts, exponential backoff (base 1s, multiplier 2×), and jitter. Retry count MUST be tracked using RabbitMQ's built-in `x-death` header rather than custom headers.
- **FR-019**: When a message handler throws an error classified as retryable, the message MUST be nacked and requeued up to the configured retry limit. The current attempt count MUST be read from the `x-death` header's `count` field.
- **FR-020**: When retry attempts are exhausted, the message MUST be routed to a Dead Letter Queue. The DLQ naming convention MUST follow `<original-queue>.dlq`.
- **FR-021**: The library MUST configure DLQ topology automatically when asserting queues, using RabbitMQ's `x-dead-letter-exchange` and `x-dead-letter-routing-key` arguments.
- **FR-022**: Messages routed to DLQ MUST preserve their original headers, payload, and correlation context.
- **FR-023**: Non-retryable errors (deserialization failures, schema validation errors) MUST bypass retry and route directly to the DLQ.

#### Metrics

- **FR-024**: The library MUST emit metrics for: messages published (`messaging_published_total`), messages consumed (`messaging_consumed_total`), consumer errors (`messaging_consumer_errors_total`), and messages sent to DLQ (`messaging_dlq_total`). All metrics MUST include `service`, `exchange`, and `queue` labels.
- **FR-025**: The library MUST emit a latency histogram for message processing duration (`messaging_processing_duration_seconds`).

---

### 2. `@forgekit/shared-security`

#### Identity Extraction

- **FR-026**: The library MUST export an `IdentityContext` type containing at minimum `userId` (string) and `role` (string), with both fields optional to support unauthenticated flows. Additional claims such as `permissions` are deferred to a follow-up specification.
- **FR-027**: The library MUST export an `extractIdentityFromHeaders` function that reads `x-forgekit-user-id` and `x-forgekit-role` from an HTTP headers object and returns a validated `IdentityContext`.
- **FR-028**: Header name constants (`X_FORGEKIT_USER_ID`, `X_FORGEKIT_ROLE`) MUST be exported so that services and the gateway reference a single source of truth instead of hardcoded strings.
- **FR-029**: The extraction function MUST trim and validate extracted values. Empty strings and whitespace-only values MUST be treated as absent.
- **FR-030**: The library MUST export an `extractIdentityFromMessageHeaders` function that extracts identity from RabbitMQ message properties/headers using the same constants and validation rules.

#### Fastify Plugin

- **FR-031**: The library MUST export a Fastify plugin (`identityPlugin`) that decorates every incoming request with a typed `identity` property containing the extracted `IdentityContext`.
- **FR-032**: The plugin MUST extract identity on every request and attach it before route handlers execute.
- **FR-033**: The plugin MUST NOT reject requests with missing identity headers. Unauthenticated requests MUST receive an `IdentityContext` where `userId` and `role` are `undefined`.

#### Authorization Guards

- **FR-034**: The library MUST export a `requireIdentity` guard function (Fastify preHandler) that returns HTTP 401 if `userId` is absent from the request identity.
- **FR-035**: The library MUST export a `requireRole` factory function that accepts one or more allowed roles and returns a preHandler that responds HTTP 403 if the request identity's role is not in the allowed list.
- **FR-036**: Guard functions MUST use `@forgekit/shared-error-handling` error codes in their rejection responses to maintain response consistency.

#### Identity Propagation

- **FR-037**: The library MUST export an `injectIdentityHeaders` function that accepts an `IdentityContext` and returns a headers object suitable for forwarding identity to downstream HTTP services or injecting into message properties.

---

### 3. `@forgekit/shared-error-handling`

#### Error Classification

- **FR-038**: The library MUST export an `AppError` class extending `Error` with the following properties: `code` (string — the stable error code), `statusCode` (number — the HTTP status), `isOperational` (boolean — `true` for expected business errors, `false` for unexpected internal failures).
- **FR-039**: The library MUST export named factory functions for common error classifications:
  - `validationError(message, details?)` → code `VALIDATION`, status 400
  - `unauthorizedError(message?)` → code `UNAUTHORIZED`, status 401
  - `forbiddenError(message?)` → code `FORBIDDEN`, status 403
  - `notFoundError(message?)` → code `NOT_FOUND`, status 404
  - `conflictError(message?)` → code `CONFLICT`, status 409
  - `dependencyError(message, details?)` → code `DEPENDENCY_FAILURE`, status 502
  - `internalError(message?)` → code `INTERNAL_ERROR`, status 500
- **FR-040**: `AppError` MUST support an optional `details` property (arbitrary serializable object) to attach structured information such as validation issues without modifying the top-level response shape.

#### Standardized Error Response

- **FR-041**: The library MUST export an `ErrorResponse` type matching the exact contract from Spec 003 FR-062:
  ```typescript
  type ErrorResponse = {
      code: string;
      message: string;
      correlationId: string;
      traceId: string | undefined;
      details?: unknown;
  };
  ```
- **FR-042**: The library MUST export a `toErrorResponse` function that converts any `Error` (or `AppError`) into an `ErrorResponse`, automatically injecting `correlationId` and `traceId` from `@forgekit/shared-observability`.
- **FR-043**: For non-`AppError` instances (unexpected errors), `toErrorResponse` MUST sanitize the message to `"Unexpected internal error"` and set code to `INTERNAL_ERROR`.

#### Fastify Plugin

- **FR-044**: The library MUST export a Fastify error-handler plugin (`errorHandlerPlugin`) that catches all errors and replies with the standardized `ErrorResponse`.
- **FR-045**: The plugin MUST log all errors using `@forgekit/shared-observability` logger with appropriate log levels: `warn` for operational errors (4xx), `error` for unexpected errors (5xx).
- **FR-046**: The plugin MUST create or annotate the active tracing span with error metadata.
- **FR-047**: The plugin MUST include `details` in the response body only for operational errors. Unexpected internal errors MUST NOT expose details.

#### Migration Path

- **FR-048**: The `errorHandlerPlugin` MUST be a drop-in replacement for `observabilityErrorHandlerPlugin` from `@forgekit/shared-observability`. After migration, the observability package MUST deprecate `observabilityErrorHandlerPlugin` and re-export it as a thin wrapper around the new `errorHandlerPlugin` from `@forgekit/shared-error-handling` to maintain backward compatibility during the transition period.

---

### Cross-Package Integration

- **FR-049**: `@forgekit/shared-messaging` MUST depend on `@forgekit/shared-observability` for logging, tracing, context propagation, and metrics registration.
- **FR-050**: `@forgekit/shared-security` MUST have zero required runtime dependencies beyond Node.js built-ins and Fastify types. It MAY depend on `@forgekit/shared-error-handling` for guard rejection responses.
- **FR-051**: `@forgekit/shared-error-handling` MUST depend on `@forgekit/shared-observability` for correlation ID and trace ID retrieval.
- **FR-052**: All three packages MUST follow the same project structure, build, and lint conventions as existing shared packages (`tsconfig.json` extending `tsconfig.base.json`, `src/index.ts` entrypoint, `package.json` with `@forgekit/` scope).

---

## Key Entities

- **MessagingClient**: The managed abstraction over AMQP connections and channels. Owns connection lifecycle, topology declaration, publish/consume operations, retry scheduling, and DLQ routing.
- **IdentityContext**: A typed object representing the authenticated user's identity as propagated by the API Gateway through standardized headers.
- **AppError**: A structured error class that carries an error code, HTTP status, operational classification, and optional details — the canonical way to signal failures across ForgeKit services.
- **ErrorResponse**: The serialized JSON error body returned to API consumers, containing exactly the fields required by Spec 003 FR-062.
- **Dead Letter Queue (DLQ)**: A broker queue where messages that exhausted their retry budget are stored for manual inspection or automated recovery.
- **Authorization Guard**: A Fastify preHandler that enforces identity or role requirements before the route handler executes.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A service developer can publish a domain event in ≤5 lines of code using `@forgekit/shared-messaging`, and the published message automatically contains correlation ID, traceparent, and persistence flag without any manual header injection.
- **SC-002**: A service developer can start consuming a queue in ≤10 lines of code, and failed messages are automatically retried (3× exponential backoff) then routed to a DLQ without service-specific retry logic.
- **SC-003**: A reviewer can inspect any service route that accesses user identity and confirm it uses the typed `IdentityContext` from `@forgekit/shared-security` instead of raw `request.headers['x-forgekit-user-id']` access.
- **SC-004**: A reviewer can trigger any error type across any service and confirm that all error responses match the exact JSON structure `{ code, message, correlationId, traceId }` as required by Spec 003 FR-062.
- **SC-005**: After adopting the three packages, the service template's messaging example (`example-messaging.ts`) is reduced by at least 60% in lines of code while maintaining identical observable behavior.
- **SC-006**: Broker readiness is automatically reported in `/health/ready` by registering the messaging client's health check — no custom readiness code required in each service.
- **SC-007**: The `observabilityErrorHandlerPlugin` in `@forgekit/shared-observability` can be replaced by the new `errorHandlerPlugin` from `@forgekit/shared-error-handling` without changing any route handler code.

---

## Non-Goals

- This specification does NOT define a generic messaging abstraction layer that supports multiple broker technologies. The implementation targets RabbitMQ specifically.
- This specification does NOT define RBAC policies, permission models, or fine-grained authorization rules. It only standardizes how identity is extracted and how basic role guards are applied.
- This specification does NOT mandate changes to the API Gateway's authentication or identity injection logic. It standardizes how downstream services consume the headers the gateway already provides.
- This specification does NOT replace domain-specific error handling logic. Services retain full control over when and why they throw errors; the library standardizes how those errors are serialized for API consumers.

---

## Assumptions

- RabbitMQ remains the messaging backbone as established in Spec 002.
- The API Gateway continues to inject identity via `x-forgekit-user-id` and `x-forgekit-role` headers as implemented in the current gateway.
- Services use Fastify as the HTTP framework, matching the current reference stack.
- `@forgekit/shared-observability` remains the canonical source for logger, correlation IDs, tracing, and metrics registration.
- The service template (`packages/service-template`) will be updated to use these libraries once they are implemented, but that update is tracked as a follow-up task.

---

## Implementation Order

The three packages MUST be implemented in the following order due to their dependency chain:

1. **`@forgekit/shared-error-handling`** — No dependency on the other two new packages. Provides `AppError` and `ErrorResponse` used by all other packages.
2. **`@forgekit/shared-security`** — Depends on `shared-error-handling` for guard rejection responses.
3. **`@forgekit/shared-messaging`** — Depends on `shared-observability` (existing). Independent of the other two new packages but implemented last due to higher complexity.

After all three are implemented, a follow-up task MUST update:
- The service template (`packages/service-template`) to use the new libraries.
- `@forgekit/shared-observability` to deprecate and re-export `observabilityErrorHandlerPlugin`.

---

## Resolved Design Decisions

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Include `permissions` in `IdentityContext`? | Deferred to follow-up | Current gateway only injects `user-id` and `role`. Adding `permissions` now would be speculative. |
| 2 | Deprecation strategy for `observabilityErrorHandlerPlugin` | Deprecate with re-export shim | Keeps backward compatibility while guiding adoption of `shared-error-handling`. |
| 3 | Retry count tracking mechanism | RabbitMQ built-in `x-death` header | Leverages native broker semantics, avoids custom header management, and preserves retry metadata across redeliveries. |
| 4 | Implementation order | `error-handling` → `security` → `messaging` | Follows the dependency chain; each package builds on the previous. |
