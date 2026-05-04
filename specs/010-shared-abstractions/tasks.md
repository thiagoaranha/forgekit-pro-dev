# Implementation Tasks: Shared Abstractions

**Branch**: `feat/010-shared-abstractions`
**Source Plan**: [plan.md](./plan.md)
**Source Spec**: [spec.md](./spec.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create all three package skeletons so they build, lint, and are recognized by the pnpm workspace.

- [ ] **T001** [P] Create `packages/shared-error-handling/package.json` with `@forgekit/shared-error-handling` name, workspace dependencies on `@forgekit/shared-observability`, peer dependency on `fastify`, and `fastify-plugin` dependency. Add `build` and `lint` scripts matching existing packages.
- [ ] **T002** [P] Create `packages/shared-error-handling/tsconfig.json` extending `../../tsconfig.base.json` with `outDir: "dist"` and `rootDir: "src"`.
- [ ] **T003** [P] Create `packages/shared-security/package.json` with `@forgekit/shared-security` name, workspace dependency on `@forgekit/shared-error-handling`, peer dependency on `fastify`, and `fastify-plugin` dependency.
- [ ] **T004** [P] Create `packages/shared-security/tsconfig.json` extending `../../tsconfig.base.json`.
- [ ] **T005** [P] Create `packages/shared-messaging/package.json` with `@forgekit/shared-messaging` name, workspace dependency on `@forgekit/shared-observability`, `amqplib` runtime dependency, `@types/amqplib` dev dependency, and `prom-client` dependency.
- [ ] **T006** [P] Create `packages/shared-messaging/tsconfig.json` extending `../../tsconfig.base.json`.
- [ ] **T007** Create empty `src/index.ts` barrel files for all three packages. Run `pnpm install` to verify workspace resolution, then `pnpm build` to verify all packages compile.

**Checkpoint**: All three packages exist, compile, and are visible in the workspace. No functionality yet.

---

## Phase 2: User Story 3 — `@forgekit/shared-error-handling` (Priority: P2) 🎯 Foundation

**Goal**: Provide `AppError`, factory functions, `ErrorResponse` type, `toErrorResponse` converter, and a Fastify error-handler plugin that produces consistent FR-062 responses.

**Independent Test**: Throw any `AppError` subtype or raw `Error` in a Fastify route and confirm the response matches `{ code, message, correlationId, traceId }` exactly.

### Implementation

- [ ] **T008** [US3] Create `packages/shared-error-handling/src/app-error.ts`:
  - `AppError` class extending `Error` with `code: string`, `statusCode: number`, `isOperational: boolean`, `details?: unknown`.
  - Named factory functions: `validationError`, `unauthorizedError`, `forbiddenError`, `notFoundError`, `conflictError`, `dependencyError`, `internalError`.
  - Each factory sets appropriate defaults (FR-038, FR-039, FR-040).

- [ ] **T009** [US3] Create `packages/shared-error-handling/src/error-response.ts`:
  - `ErrorResponse` type matching Spec 003 FR-062 contract: `{ code, message, correlationId, traceId, details? }`.
  - `toErrorResponse(error: unknown)` function that:
    - For `AppError`: extracts `code`, `statusCode`, `message`, `details` (details only if `isOperational`).
    - For other `Error`: sanitizes to `{ code: 'INTERNAL_ERROR', message: 'Unexpected internal error', statusCode: 500 }`.
    - Injects `correlationId` via `getCorrelationId()` and `traceId` via `getTraceId()` from `@forgekit/shared-observability`.
  - (FR-041, FR-042, FR-043)

- [ ] **T010** [US3] Create `packages/shared-error-handling/src/error-handler-plugin.ts`:
  - Fastify plugin using `fastify-plugin` that calls `setErrorHandler`.
  - Uses `toErrorResponse` to build the response body.
  - Logs with `logger.warn` for operational errors (4xx), `logger.error` for unexpected errors (5xx).
  - Annotates the active tracing span with error metadata using `getTraceId`.
  - Includes `details` only for operational errors in the response.
  - (FR-044, FR-045, FR-046, FR-047)

- [ ] **T011** [US3] Create `packages/shared-error-handling/src/index.ts`:
  - Barrel re-exporting: `AppError`, all factory functions, `ErrorResponse`, `toErrorResponse`, `errorHandlerPlugin`.
  - Verify `pnpm build` passes for the package.
  - (FR-052)

**Checkpoint**: `@forgekit/shared-error-handling` is fully functional. Throwing `validationError('Name is required')` in any Fastify route produces `{ code: 'VALIDATION', message: 'Name is required', correlationId: '...', traceId: '...' }` with status 400.

---

## Phase 3: User Story 2 — `@forgekit/shared-security` (Priority: P2)

**Goal**: Provide typed identity extraction from HTTP headers and message headers, a Fastify plugin for request-scoped identity, and authorization guard preHandlers.

**Independent Test**: Register `identityPlugin` in a Fastify service, send a request with/without `x-forgekit-user-id` header, and confirm `request.identity` is correctly populated or undefined.

### Implementation

- [ ] **T012** [US2] Create `packages/shared-security/src/identity-context.ts`:
  - `IdentityContext` type: `{ userId: string | undefined; role: string | undefined }`.
  - Exported header constants: `X_FORGEKIT_USER_ID = 'x-forgekit-user-id'`, `X_FORGEKIT_ROLE = 'x-forgekit-role'`.
  - (FR-026, FR-028)

- [ ] **T013** [US2] Create `packages/shared-security/src/identity-extraction.ts`:
  - `extractIdentityFromHeaders(headers)` — reads headers using constants, trims values, treats empty/whitespace-only as `undefined`.
  - `extractIdentityFromMessageHeaders(headers)` — same logic for RabbitMQ message `properties.headers` objects (handles `Buffer` values from AMQP).
  - `injectIdentityHeaders(identity)` — converts `IdentityContext` back into a headers object for propagation.
  - (FR-027, FR-029, FR-030, FR-037)

- [ ] **T014** [US2] Create `packages/shared-security/src/identity-plugin.ts`:
  - Fastify plugin (`identityPlugin`) using `fastify-plugin`.
  - Decorates the Fastify instance with `identity` on the request object.
  - Uses `addHook('onRequest')` to extract identity from `request.headers` on every request.
  - Does NOT reject unauthenticated requests — sets `userId` and `role` to `undefined`.
  - (FR-031, FR-032, FR-033)

- [ ] **T015** [US2] Create `packages/shared-security/src/guards.ts`:
  - `requireIdentity` — Fastify preHandler. Returns 401 via `unauthorizedError()` from `@forgekit/shared-error-handling` if `request.identity.userId` is absent.
  - `requireRole(...roles)` — Factory returning a Fastify preHandler. Returns 403 via `forbiddenError()` if `request.identity.role` is not in the allowed list.
  - (FR-034, FR-035, FR-036)

- [ ] **T016** [US2] Create `packages/shared-security/src/index.ts`:
  - Barrel re-exporting: `IdentityContext`, `X_FORGEKIT_USER_ID`, `X_FORGEKIT_ROLE`, `extractIdentityFromHeaders`, `extractIdentityFromMessageHeaders`, `injectIdentityHeaders`, `identityPlugin`, `requireIdentity`, `requireRole`.
  - Verify `pnpm build` passes for the package.
  - (FR-052)

**Checkpoint**: `@forgekit/shared-security` is fully functional. A service can `server.register(identityPlugin)` and access `request.identity.userId` in any route handler. Guards work with consistent error responses from `shared-error-handling`.

---

## Phase 4: User Story 1 — `@forgekit/shared-messaging` (Priority: P1) 🎯 MVP

**Goal**: Provide a managed RabbitMQ client with auto-reconnect, typed publish/subscribe, automatic observability injection, retry with `x-death` tracking, and DLQ routing.

**Independent Test**: Create a `MessagingClient`, publish a message, consume it, confirm correlation ID is propagated. Simulate a processing failure and confirm the message is retried 3× then routed to `queue.dlq`.

### Implementation

- [ ] **T017** [US1] Create `packages/shared-messaging/src/types.ts`:
  - `MessagingClientOptions` — `url`, `serviceName`, optional `reconnect` (maxAttempts, baseDelayMs, maxDelayMs) and `retry` (maxAttempts, baseDelayMs) configs.
  - `PublishOptions` — optional overrides for exchange type, persistent flag, custom headers.
  - `SubscribeOptions` — optional prefetch count, noAck flag.
  - `AssertQueueOptions` — optional durable, exclusive, DLQ configuration overrides.
  - `MessageHandler<T>` — `(payload: T, metadata: MessageMetadata) => Promise<void> | void`.
  - `MessageMetadata` — `correlationId`, `traceparent`, `retryCount`, `identity` (IdentityContext), `headers`.
  - `MessagingClient` interface — `connect`, `disconnect`, `assertExchange`, `assertQueue`, `bindQueue`, `publish`, `subscribe`, `healthCheck`.

- [ ] **T018** [US1] Create `packages/shared-messaging/src/connection-manager.ts`:
  - Internal class that wraps `amqplib.connect`.
  - Emits lifecycle events: `connected`, `disconnected`, `reconnecting`, `reconnected`, `failed`.
  - Logs all lifecycle events using `@forgekit/shared-observability` logger (FR-004).
  - Auto-reconnects on `close`/`error` events using exponential backoff with jitter. Default: base 1s, max 30s, max 10 attempts (FR-003).
  - Provides `getChannel()` that lazily creates a confirm channel.
  - Provides `disconnect()` for graceful shutdown — closes channel then connection (FR-005).

- [ ] **T019** [US1] Create `packages/shared-messaging/src/publisher.ts`:
  - `publish<T>(channel, exchange, routingKey, payload, options)` function.
  - Serializes payload to JSON Buffer, sets `contentType: 'application/json'`, `persistent: true` (FR-009, FR-010).
  - Injects `x-correlation-id` and `traceparent` via `injectObservabilityHeaders()` (FR-008).
  - Wraps in a tracing span of kind `PRODUCER` (FR-011).
  - (FR-007)

- [ ] **T020** [US1] Create `packages/shared-messaging/src/retry-policy.ts`:
  - `parseRetryCount(message)` — reads `x-death` header array, extracts `count` from the first entry matching the original queue. Returns 0 if no `x-death` header present (FR-018).
  - `isRetryExhausted(message, maxAttempts)` — returns `true` when `parseRetryCount >= maxAttempts` (FR-019).
  - `NonRetryableError` class — signals deserialization/schema failures that should bypass retry (FR-023).
  - DLQ topology helper: `assertQueueWithDlq(channel, queueName, options)` — asserts the main queue with `x-dead-letter-exchange` and `x-dead-letter-routing-key` pointing to a retry exchange, and asserts the `<queue>.dlq` queue (FR-020, FR-021, FR-022).

- [ ] **T021** [US1] Create `packages/shared-messaging/src/consumer.ts`:
  - `subscribe<T>(channel, queue, handler, options, retryPolicy)` function.
  - Extracts `x-correlation-id`, `traceparent` from message `properties.headers` (FR-014).
  - Restores observability context via `runWithObservabilityContext` (FR-016).
  - Wraps handler in `withMessageTelemetry` (FR-016).
  - Deserializes JSON payload, catches parse errors as `NonRetryableError` (FR-015, FR-023).
  - On handler error: checks retry count via `x-death`. If retryable and not exhausted: `nack(msg, false, false)` (message goes to retry exchange → back to queue). If exhausted or non-retryable: `nack(msg, false, false)` (routes to DLQ) (FR-019, FR-020, FR-023).
  - On success: `ack(msg)`.
  - (FR-013)

- [ ] **T022** [US1] Create `packages/shared-messaging/src/messaging-metrics.ts`:
  - Register metrics using `prom-client` (or re-use registry from `shared-observability`):
    - `messaging_published_total` — Counter with `service`, `exchange`, `routing_key` labels.
    - `messaging_consumed_total` — Counter with `service`, `queue`, `outcome` labels.
    - `messaging_consumer_errors_total` — Counter with `service`, `queue` labels.
    - `messaging_dlq_total` — Counter with `service`, `queue` labels.
    - `messaging_processing_duration_seconds` — Histogram with `service`, `queue`, `outcome` labels.
  - (FR-024, FR-025)

- [ ] **T023** [US1] Create `packages/shared-messaging/src/messaging-client.ts`:
  - `createMessagingClient(options)` factory returning a `MessagingClient` implementation.
  - Composes `ConnectionManager`, `publish`, `subscribe`, `assertExchange`, `assertQueue`, `bindQueue`.
  - `healthCheck()` returns a `ReadinessCheck` compatible object that tests broker connectivity (FR-006).
  - Integrates metrics from `messaging-metrics.ts` — increments counters on publish/consume/error/DLQ.
  - (FR-001, FR-002, FR-012, FR-017)

- [ ] **T024** [US1] Create `packages/shared-messaging/src/index.ts`:
  - Barrel re-exporting: `createMessagingClient`, `MessagingClient`, `MessagingClientOptions`, `PublishOptions`, `SubscribeOptions`, `MessageHandler`, `MessageMetadata`, `NonRetryableError`.
  - Verify `pnpm build` passes for the package.
  - (FR-052)

**Checkpoint**: `@forgekit/shared-messaging` is fully functional. A service can create a client, publish events with auto-injected correlation IDs, consume with automatic retry/DLQ, and register broker health checks — all in ~10 lines of service code.

---

## Phase 5: Deprecation Shim

**Purpose**: Update `@forgekit/shared-observability` to deprecate the old error handler and re-export from the new package.

- [ ] **T025** Add `@forgekit/shared-error-handling` as a workspace dependency in `packages/shared-observability/package.json`.

- [ ] **T026** Update `packages/shared-observability/src/index.ts`:
  - Add `@deprecated` JSDoc annotation to the existing `observabilityErrorHandlerPlugin`.
  - Import `errorHandlerPlugin` from `@forgekit/shared-error-handling`.
  - Re-export it as `observabilityErrorHandlerPlugin` with the deprecation notice.
  - Remove the old inline implementation of `observabilityErrorHandlerPlugin` (and its internal helpers like `classifyError`) since they are now superseded.
  - (FR-048)

**Checkpoint**: Existing services that import `observabilityErrorHandlerPlugin` from `@forgekit/shared-observability` continue to work without code changes. IDE deprecation warnings guide developers to the new import path.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build verification, lint, and documentation for all three packages.

- [ ] **T027** [P] Run `pnpm build` from root — verify all packages and all existing services compile cleanly.
- [ ] **T028** [P] Run `pnpm lint` from root — verify all packages pass linting with zero errors.
- [ ] **T029** [P] Verify that `example-service` still builds and starts correctly with the deprecated shim in `shared-observability`.
- [ ] **T030** Update the spec status from `Draft` to `Approved` in `specs/010-shared-abstractions/spec.md`.

**Checkpoint**: All packages build, lint, and the existing codebase is unaffected.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately.
- **Phase 2 (Error Handling)**: Depends on Phase 1 completion.
- **Phase 3 (Security)**: Depends on Phase 2 completion (`shared-security` imports from `shared-error-handling`).
- **Phase 4 (Messaging)**: Depends on Phase 1 completion. Can run in parallel with Phase 3 if desired, but sequential execution is recommended for review quality.
- **Phase 5 (Deprecation)**: Depends on Phase 2 completion.
- **Phase 6 (Polish)**: Depends on all previous phases.

### Within Each Phase

- Tasks marked `[P]` can run in parallel (different files, no dependencies).
- Barrel `index.ts` tasks must be last within each phase.

### Parallel Opportunities

```text
Phase 1: T001..T006 all parallel → T007 sequential (install + verify)
Phase 2: T008, T009 parallel → T010 (depends on T009) → T011
Phase 3: T012, T013 parallel → T014 (depends on T012, T013) → T015 (depends on T014) → T016
Phase 4: T017 first → T018, T019, T020, T022 parallel → T021 (depends on T020) → T023 (depends on all) → T024
Phase 5: T025 → T026
Phase 6: T027..T029 all parallel → T030
```

---

## Notes

- [P] tasks = different files, no dependencies.
- [US1/US2/US3] maps to spec user stories for traceability.
- No existing service code is modified (except the deprecation shim in `shared-observability`).
- Template updates (`service-template`, `example-service`) are tracked as a separate follow-up.
- Commit after each phase completion using Conventional Commits: `feat(shared-error-handling):`, `feat(shared-security):`, `feat(shared-messaging):`.
