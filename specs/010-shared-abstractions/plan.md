# Implementation Plan: Shared Abstractions

**Branch**: `feat/010-shared-abstractions` | **Date**: 2026-05-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-shared-abstractions/spec.md`

## Summary

Implement three shared packages — `@forgekit/shared-error-handling`, `@forgekit/shared-security`, and `@forgekit/shared-messaging` — that standardize cross-cutting concerns across every ForgeKit service. The packages are built in strict dependency order: error handling first (foundation), then security (uses error types for guards), then messaging (highest complexity). Each package follows the existing shared-package conventions (scoped `@forgekit/` name, `src/index.ts` entrypoint, `tsconfig.json` extending base).

## Technical Context

**Language/Version**: TypeScript 5.4+ on Node.js 22 LTS
**Primary Dependencies**:
  - `@forgekit/shared-error-handling`: `@forgekit/shared-observability` (workspace), `fastify` (peer), `fastify-plugin`
  - `@forgekit/shared-security`: `@forgekit/shared-error-handling` (workspace), `fastify` (peer), `fastify-plugin`
  - `@forgekit/shared-messaging`: `@forgekit/shared-observability` (workspace), `amqplib`, `prom-client`
**Storage**: N/A (libraries, not services)
**Testing**: Vitest with `@vitest/coverage-v8` (matching the existing `packages/service-template` test setup)
**Target Platform**: Node.js server-side (consumed by Fastify services)
**Project Type**: Shared library packages in a pnpm monorepo
**Performance Goals**: Sub-millisecond overhead for error/identity extraction. Messaging publish latency ≤ raw `amqplib` + 5ms tracing overhead.
**Constraints**: Must not break any existing service. Must be additive — no existing API surfaces change until the deprecation shim is in place.
**Scale/Scope**: 3 new packages under `packages/`, ~200-400 LOC each.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Clean Code & Readability**: ✅ Pass. Each package has a single responsibility, a small public API, and descriptive naming. No speculative abstractions — each feature addresses a documented gap.
- **Testing Standards**: ✅ Pass. Unit tests required for all three packages. Integration tests for messaging (broker connection, retry/DLQ). Coverage ≥ 80%.
- **Performance & Concurrency**: ✅ Pass. Messaging client uses async/await with non-blocking I/O. Reconnection uses bounded backoff to avoid resource exhaustion. No blocking operations in request paths.
- **Security by Default**: ✅ Pass. Identity extraction validates and trims inputs. Error sanitization prevents leaking internal details. No secrets exposed in logs.
- **Observability & Traceability**: ✅ Pass. All three packages integrate with `@forgekit/shared-observability` for correlation IDs, structured logging, and tracing spans.
- **Microservices Architecture Boundaries**: ✅ Pass. These are cross-cutting utilities permitted by Spec 003 FR-012 and Spec 008 FR-080. They enforce consistency without crossing domain boundaries.
- **AI-Assisted Development Governance**: ✅ Pass. All code will be reviewed before merge.

## Project Structure

### Documentation (this feature)

```text
specs/010-shared-abstractions/
├── spec.md
├── plan.md             # This file
└── tasks.md            # Phase 2 output
```

### Source Code (repository root)

```text
packages/
├── shared-error-handling/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts           # Public API re-exports
│       ├── app-error.ts       # AppError class + factory functions
│       ├── error-response.ts  # ErrorResponse type + toErrorResponse converter
│       └── error-handler-plugin.ts  # Fastify error-handler plugin
│
├── shared-security/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts           # Public API re-exports
│       ├── identity-context.ts     # IdentityContext type + header constants
│       ├── identity-extraction.ts  # extractIdentityFromHeaders, extractIdentityFromMessageHeaders
│       ├── identity-plugin.ts      # Fastify identityPlugin
│       └── guards.ts               # requireIdentity, requireRole preHandlers
│
├── shared-messaging/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts           # Public API re-exports
│       ├── types.ts           # MessagingClientOptions, PublishOptions, SubscribeOptions, MessageHandler
│       ├── messaging-client.ts     # createMessagingClient factory + MessagingClient class
│       ├── connection-manager.ts   # AMQP connection lifecycle, reconnection with backoff
│       ├── publisher.ts            # Publish logic with observability injection
│       ├── consumer.ts            # Subscribe logic with context extraction, retry tracking
│       ├── retry-policy.ts        # Retry classification, x-death header parsing, DLQ routing
│       └── messaging-metrics.ts   # Prometheus counters + histograms for messaging
│
├── shared-observability/          # Existing — modified for deprecation shim only
│   └── src/
│       └── index.ts               # Add re-export of errorHandlerPlugin with @deprecated JSDoc
│
└── shared-tooling/                # Existing — no changes
```

**Structure Decision**: Three new top-level packages under `packages/` following the exact same conventions as `shared-observability` and `shared-tooling`. Each package uses a barrel `index.ts` re-exporting from focused internal modules. Internal modules are not exposed as public API — consumers import only from `@forgekit/shared-*`.

## Phase 0: Research Findings

### `amqplib` Reconnection Patterns

- `amqplib` does not auto-reconnect. The `connection.on('close')` and `connection.on('error')` events must be handled manually.
- The recommended pattern is a wrapper class that recreates the connection and channels on disconnect, using exponential backoff (base × 2^attempt + jitter).
- Channels should be recreated lazily (on next publish/subscribe call) rather than eagerly, to avoid thundering herd on broker restart.

### RabbitMQ `x-death` Header for Retry Tracking

- When a message is dead-lettered (nacked without requeue, or TTL-expired), RabbitMQ adds/updates an `x-death` array header.
- Each entry contains `{ queue, reason, count, exchange, routing-keys, time }`.
- `count` is incremented on each dead-letter cycle to the same queue, making it a native retry counter.
- Implementation: Set up a retry exchange/queue pair. On failure, nack → message goes to retry queue with a fixed configurable TTL, then re-routes to the original queue and increments `x-death[0].count`.

### Fastify Plugin Registration Order

- Error handler (`setErrorHandler`) applies to routes registered **after** the plugin. Must be registered early.
- Identity plugin (`addHook('onRequest')`) runs in registration order. Must register after `observabilityPlugin` (which sets up correlation context) but before route handlers.
- The existing `observabilityErrorHandlerPlugin` follows this pattern correctly — the new `errorHandlerPlugin` must maintain the same registration position.

### Existing Error Handler Analysis

The current `observabilityErrorHandlerPlugin` (lines 686-715 in `shared-observability`) already implements:
- Status code extraction, error classification, correlation ID injection
- Structured logging with `logger.error`
- Response shape `{ code, message, correlationId, traceId }`

The new `errorHandlerPlugin` will:
1. Add `AppError` awareness (extract `code`, `statusCode`, `isOperational`, `details`)
2. Add `warn` vs `error` log-level distinction based on `isOperational`
3. Add `details` exposure only for operational errors
4. Maintain the same response shape for backward compatibility

## Phase 1: Design

### Testing Strategy

- Each new shared package MUST include `vitest.config.ts`, `test` and `test:watch` scripts, and coverage thresholds matching `packages/service-template`: 80% lines/statements/functions and 70% branches.
- `@forgekit/shared-error-handling` and `@forgekit/shared-security` require unit tests for their public APIs and Fastify plugins/guards.
- `@forgekit/shared-messaging` requires unit tests for retry parsing, poison message classification, metrics labels, and publish options.
- `@forgekit/shared-messaging` also requires RabbitMQ integration tests for publish/consume propagation, fixed-delay retry, DLQ confirm-then-ack, poison message DLQ routing, and readiness checks.
- Root verification MUST include `pnpm test` in addition to `pnpm build` and `pnpm lint`.

### Package 1 — `@forgekit/shared-error-handling`

**Public API Surface**:

```typescript
// AppError class
class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly details?: unknown;
}

// Factory functions
function validationError(message: string, details?: unknown): AppError;
function unauthorizedError(message?: string): AppError;
function forbiddenError(message?: string): AppError;
function notFoundError(message?: string): AppError;
function conflictError(message?: string): AppError;
function dependencyError(message: string, details?: unknown): AppError;
function internalError(message?: string): AppError;

// ErrorResponse type + converter
type ErrorResponse = {
  code: string;
  message: string;
  correlationId: string;
  traceId: string | undefined;
  details?: unknown;
};
function toErrorResponse(error: unknown): { statusCode: number; body: ErrorResponse };

// Fastify plugin
const errorHandlerPlugin: FastifyPluginAsync;
```

### Package 2 — `@forgekit/shared-security`

**Public API Surface**:

```typescript
// Constants
const X_FORGEKIT_USER_ID = 'x-forgekit-user-id';
const X_FORGEKIT_ROLE = 'x-forgekit-role';

// Type
type IdentityContext = {
  userId: string | undefined;
  role: string | undefined;
};

// Extraction
function extractIdentityFromHeaders(headers: Record<string, string | string[] | undefined>): IdentityContext;
function extractIdentityFromMessageHeaders(headers: Record<string, unknown>): IdentityContext;
function injectIdentityHeaders(identity: IdentityContext): Record<string, string>;

// Fastify plugin
const identityPlugin: FastifyPluginAsync;

// Guards
function requireIdentity(request: FastifyRequest, reply: FastifyReply): Promise<void>;
function requireRole(...roles: string[]): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
```

### Package 3 — `@forgekit/shared-messaging`

**Public API Surface**:

```typescript
// Factory
function createMessagingClient(options: MessagingClientOptions): MessagingClient;

// Client interface
interface MessagingClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  assertExchange(name: string, type?: string): Promise<void>;
  assertQueue(name: string, options?: AssertQueueOptions): Promise<void>;
  bindQueue(queue: string, exchange: string, routingKey: string): Promise<void>;
  publish<T>(exchange: string, routingKey: string, payload: T, options?: PublishOptions): Promise<void>;
  subscribe<T>(queue: string, handler: MessageHandler<T>, options?: SubscribeOptions): Promise<void>;
  healthCheck(): ReadinessCheck;
}

// Types
type MessagingClientOptions = {
  url: string;
  serviceName: string;
  reconnect?: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number };
  retry?: { maxAttempts?: number; delayMs?: number };
};
type SubscribeOptions<T = unknown> = {
  prefetch?: number;
  noAck?: boolean;
  requireJsonContentType?: boolean;
  validate?: (payload: unknown) => T | Promise<T>;
};
type MessageHandler<T> = (payload: T, metadata: MessageMetadata) => Promise<void> | void;
type MessageMetadata = { correlationId: string; traceparent: string; retryCount: number; headers: Record<string, unknown> };
```

**Retry/DLQ Topology** (automatic when asserting a queue):

```
[producer] → exchange → queue (x-dead-letter-exchange → retry-exchange)
                            ↑                                  ↓
                            └─── queue (TTL, routes back) ←── retry-exchange
                                                               ↓ (after max attempts)
                                                          queue.dlq
```

### Deprecation Shim in `shared-observability`

After `shared-error-handling` is complete, add to `shared-observability/src/index.ts`:

```typescript
/**
 * @deprecated Use `errorHandlerPlugin` from `@forgekit/shared-error-handling` instead.
 * This re-export will be removed in a future major version.
 */
export { errorHandlerPlugin as observabilityErrorHandlerPlugin } from '@forgekit/shared-error-handling';
```

## Implementation Strategy

### Execution Order (strict — each phase depends on the previous)

1. **Phase 1: Setup** — Create all three package skeletons with `package.json`, `tsconfig.json`, `vitest.config.ts`, and empty `src/index.ts`.
2. **Phase 2: `shared-error-handling`** — Implement `AppError`, factory functions, `ErrorResponse`, `toErrorResponse`, and the Fastify plugin.
3. **Phase 3: `shared-security`** — Implement `IdentityContext`, extraction functions, Fastify plugin, and guards.
4. **Phase 4: `shared-messaging`** — Implement connection manager, publisher, consumer, retry/DLQ policy, and metrics.
5. **Phase 5: Deprecation shim** — Update `shared-observability` to re-export the deprecated error handler.
6. **Phase 6: Polish** — Documentation, lint, build, test verification, and template update planning.

### Constraints

- No existing service code changes in this feature branch (template updates are a follow-up).
- All packages must build cleanly with `pnpm build`.
- All packages must pass lint with `pnpm lint`.

## Planned Artifacts

- `specs/010-shared-abstractions/tasks.md`: Execution tasks generated from this plan.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| None | N/A | N/A |
