# Feature Specification: ForgeKit Security Hardening

**Feature Branch**: `feat/011-security-hardening`
**Created**: 2026-06-02
**Status**: Draft
**Input**: Security audit reports from spec 010 post-implementation review and cross-spec infrastructure audit.

## Overview

A security audit performed after the implementation of spec 010 (Shared Abstractions) identified nine vulnerabilities across the gateway, shared packages, and infrastructure configuration. The vulnerabilities range from critical authentication bypasses to medium-severity configuration gaps. This specification consolidates all findings and defines the remediation strategy that closes each issue without altering the observable behavior of the system for legitimate traffic.

The issues are grouped into three concerns:

1. **Gateway hardening** — Authentication bypass, insecure JWT fallback, missing security headers, and hardcoded header strings.
2. **Shared package fixes** — Silent identity plugin, unsanitized error details, DLQ nack gap, and Prometheus label cardinality.
3. **Infrastructure isolation** — Direct host exposure of internal services, databases, and message broker ports.

### Design Principles

- **Fail fast, fail loud**: Misconfigurations that would silently degrade security in production (missing JWT secret, insecure defaults) MUST cause immediate startup failure with a clear log message.
- **Zero silent failures**: Every path that previously swallowed a failure or continued processing without a clear signal MUST now emit a structured log entry at `warn` or `error` level.
- **Backward-compatible for the dev loop**: Remediations that could break the local development workflow (port binding, DLQ rejection) MUST be gated by environment or clearly documented as a deliberate change.
- **No new domain coupling**: This spec introduces no new shared packages and does not modify service domain logic. Every change is scoped to cross-cutting infrastructure, configuration, or the shared libraries already established in spec 010.

### Traceability to Existing Specs

| Concern | Spec 002 (Architecture) | Spec 003 (Service Standards) | Spec 008 (Observability) | Spec 010 (Shared Abstractions) |
|---|---|---|---|---|
| Gateway auth bypass (SEC-011) | FR-035..FR-039 | — | — | — |
| Docker isolation (SEC-012) | FR-011 | FR-038 | — | — |
| JWT secret fallback (SEC-013) | FR-035 | — | — | — |
| Security headers + CORS (SEC-014) | — | FR-062 | — | — |
| Dependency vulnerabilities (SEC-015) | — | — | — | — |
| Identity plugin silent (SEC-001) | FR-062..FR-064 | — | FR-017 | FR-031..FR-033 |
| Error details leak (SEC-002) | — | FR-062, FR-066 | FR-069..FR-073 | FR-040..FR-047 |
| DLQ nack gap (SEC-006) | — | FR-038..FR-042 | — | FR-020..FR-023 |
| Metrics cardinality (SEC-007) | — | — | FR-052..FR-055 | FR-024..FR-024b |
| Hardcoded headers in gateway (SEC-008) | FR-062..FR-064 | — | — | FR-028 |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Gateway cannot be bypassed through URL manipulation (Priority: P0)

An attacker who discovers the `/health/` substring trick MUST be prevented from bypassing JWT verification on proxied routes by crafting a URL such as `GET /api/example/items?dummy=/health/`.

**Independent Test**: A reviewer can send `GET /api/example/items?x=/health/live` without a JWT Authorization header and confirm the gateway returns HTTP 401, not a forwarded response from the upstream service.

**Acceptance Scenarios**:

1. **Given** a client sends a request to `/api/example/items?bypass=/health/` without a JWT, **When** the gateway processes the request, **Then** it returns HTTP 401 and does not forward the request to the upstream.
2. **Given** a client sends a request to `/health/live` without a JWT, **When** the gateway processes the request, **Then** it returns HTTP 200 and does not require a token (health endpoints remain public).
3. **Given** a client sends a valid JWT with a request to any proxied route, **When** the gateway processes it, **Then** the request is forwarded normally.

---

### User Story 2 — Gateway refuses to start with a weak JWT secret in production (Priority: P0)

A misconfiguration in a production environment that leaves `JWT_SECRET` unset MUST cause the gateway to crash at startup with a clear error message, rather than using a hardcoded fallback secret that any attacker could exploit.

**Independent Test**: A reviewer can set `NODE_ENV=production` and start the gateway without `JWT_SECRET` and confirm the process exits immediately with a non-zero code and a structured log message indicating the reason.

**Acceptance Scenarios**:

1. **Given** `NODE_ENV=production` and `JWT_SECRET` is undefined, **When** the gateway starts, **Then** it throws an error, logs a structured `fatal` message, and exits with code `1`.
2. **Given** `NODE_ENV=development` and `JWT_SECRET` is undefined, **When** the gateway starts, **Then** it uses the hardcoded dev secret, emits a structured `warn` log noting the insecure fallback, and starts normally.
3. **Given** `JWT_SECRET` is defined in any environment, **When** the gateway starts, **Then** it uses the provided secret and emits no warning.

---

### User Story 3 — Internal services are not directly reachable from outside the Docker network (Priority: P0)

An infrastructure operator MUST be able to run the full local stack without exposing the example-service, PostgreSQL, or RabbitMQ AMQP port on the host network interface, eliminating the bypass path around the gateway.

**Independent Test**: A reviewer can run `pnpm boot` and confirm that `curl http://localhost:3001/health/live` (example-service direct) and `psql -h localhost` fail from the host while `curl http://localhost:3000/health/live` (gateway) succeeds.

**Acceptance Scenarios**:

1. **Given** the default Compose file is used, **When** the stack starts, **Then** `example-service` port 3001 is NOT accessible from the host.
2. **Given** the default Compose file is used, **When** the stack starts, **Then** PostgreSQL port 5432 is NOT accessible from the host.
3. **Given** a developer uses a `docker-compose.override.yml`, **When** it re-exposes development ports bound to `127.0.0.1`, **Then** those ports are reachable only from localhost and not from external network interfaces.

---

### User Story 4 — Identity plugin logs a warning for requests entering without identity (Priority: P1)

A service operator reviewing logs MUST be able to identify requests that entered the internal network without an authenticated identity context, so that missing `requireIdentity` guards are discoverable through log analysis rather than only through manual code review.

**Independent Test**: A reviewer can send a request to an internal service route that does not use `requireIdentity` without passing identity headers and confirm a structured `debug` log entry with the key `anonymous_request` appears in the service logs.

**Acceptance Scenarios**:

1. **Given** a request arrives at a service without `x-forgekit-user-id`, **When** `identityPlugin` processes it, **Then** a `debug`-level log entry is emitted with the field `event: 'anonymous_request'` and the request URL.
2. **Given** a request arrives with a valid `x-forgekit-user-id`, **When** `identityPlugin` processes it, **Then** no extra log entry is emitted (happy path remains noise-free).

---

### User Story 5 — Error details from operational errors do not expose internal infrastructure (Priority: P1)

A service developer who accidentally passes a database error object as `details` to a `dependencyError()` MUST be protected from leaking connection strings, raw SQL, or internal stack traces to the API consumer. The details object is sanitized before being included in the HTTP response.

**Independent Test**: A reviewer can throw a `dependencyError('DB unavailable', { connectionString: 'postgresql://user:secret@host/db', query: 'SELECT * FROM users' })` and confirm the HTTP response body does NOT contain `connectionString` or `query`, while the full object IS present in the server-side structured log.

**Acceptance Scenarios**:

1. **Given** an `AppError` is thrown with `isOperational: true` and a `details` object containing a `connectionString` key, **When** the error handler serializes the response, **Then** the `details` field in the response body does NOT contain `connectionString`.
2. **Given** an `AppError` is thrown with `isOperational: true` and a `details` object, **When** the error handler processes it, **Then** the complete `details` object IS logged at server side via the observability logger.
3. **Given** a non-operational `AppError` or generic `Error` is thrown, **When** the error handler processes it, **Then** no `details` field appears in the response body (existing behavior, must be preserved).

---

### User Story 6 — DLQ failure results in a definitive message rejection (Priority: P1)

When a message has exhausted its retry budget and the DLQ publish itself fails (e.g., the DLQ queue was deleted), the message MUST be definitively rejected from the original queue with `nack(requeue: false)` instead of being left unacknowledged and triggering an infinite redelivery loop.

**Independent Test**: A reviewer can delete the DLQ queue, produce a message that will exhaust retries, and confirm that after the DLQ publish attempt fails, the message is not redelivered indefinitely. The consumer log must contain an `error`-level entry for the failed DLQ publish followed by a `warn`-level entry confirming the definitive rejection.

**Acceptance Scenarios**:

1. **Given** a message exhausts its retry limit and the DLQ queue does not exist, **When** `publishToDlq` fails, **Then** the original message is `nack`-ed with `requeue: false` and a `warn`-level log is emitted.
2. **Given** a message exhausts its retry limit and the DLQ publish succeeds, **When** `publishToDlq` completes, **Then** the original message is `ack`-ed (existing correct behavior, must be preserved).

---

### User Story 7 — Prometheus metrics have bounded cardinality for messaging (Priority: P2)

A platform operator MUST be able to run services that use dynamic routing keys (e.g., `order.updated.12345`) without risking Prometheus out-of-memory from unbounded time series growth.

**Independent Test**: A reviewer can publish 1000 messages with unique numeric suffixes in the routing key and confirm that `curl /metrics` reports exactly one time series for `messaging_published_total` per unique `(service, exchange)` pair, not one per routing key variant.

**Acceptance Scenarios**:

1. **Given** a service publishes to routing key `order.updated.12345`, **When** metrics are emitted, **Then** the `routing_key` label is absent from `messaging_published_total`.
2. **Given** a service publishes to routing key `payment.processed.abc`, **When** metrics are emitted, **Then** the same `messaging_published_total` time series increments without creating a new label combination.

---

## Requirements *(mandatory)*

### 1. Gateway Hardening

#### SEC-011 — Authentication Bypass via URL Manipulation

- **FR-001**: The gateway's health endpoint exemption logic MUST compare the route path (`request.routeOptions.url`) against an explicit allowlist of known health endpoint paths (`/health/live`, `/health/ready`) rather than using a substring search on the raw URL string (`request.url`).
- **FR-002**: The health endpoint allowlist MUST be defined as a readonly constant array at module scope so that adding future exempted paths requires a single, intentional change.
- **FR-003**: If `request.routeOptions.url` is undefined (e.g., called from a context where route options are unavailable), the gateway MUST default to requiring JWT verification rather than exempting the request.

#### SEC-013 — Silent Fallback to Insecure JWT Secret

- **FR-004**: During gateway startup, if `NODE_ENV === 'production'` and `process.env.JWT_SECRET` is `undefined` or an empty string, the process MUST call `logger.fatal(...)` and then `process.exit(1)` before registering any plugin.
- **FR-005**: If `NODE_ENV !== 'production'` and `JWT_SECRET` is `undefined` or empty, the gateway MUST use the hardcoded dev-only secret AND emit a single `logger.warn` log with the message `'JWT_SECRET is not set — using insecure dev fallback; do not deploy to production'` before registering the JWT plugin.
- **FR-006**: The hardcoded fallback secret value MUST be defined as a named constant (`INSECURE_DEV_SECRET`) at module scope, not as an inline magic string.

#### SEC-014 — Missing Security Headers and CORS Configuration

- **FR-007**: The gateway MUST register `@fastify/helmet` to add defense-in-depth HTTP security headers (including `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` where applicable).
- **FR-008**: The gateway MUST register `@fastify/cors` with an explicit `origin` allowlist. The allowlist value MUST be read from the environment variable `ALLOWED_ORIGINS` (comma-separated). In development (when `NODE_ENV !== 'production'`), a fallback of `['http://localhost:3000', 'http://localhost:3001']` is acceptable.
- **FR-009**: Both `@fastify/helmet` and `@fastify/cors` MUST be registered before any route or proxy registration to ensure they apply to all responses.

#### SEC-008 — Hardcoded Header Strings in Gateway

- **FR-010**: The gateway `index.ts` MUST import `X_FORGEKIT_USER_ID` and `X_FORGEKIT_ROLE` constants from `@forgekit/shared-security` and use them when setting the identity forwarding headers on proxied requests.
- **FR-011**: The dependency on `@forgekit/shared-security` MUST be declared in `apps/gateway/package.json` under `dependencies`.
- **FR-012**: All inline occurrences of the strings `'x-forgekit-user-id'` and `'x-forgekit-role'` in the gateway source MUST be replaced with the imported constants.

---

### 2. Shared Package Fixes

#### SEC-001 — Identity Plugin Silent on Anonymous Requests

- **FR-013**: `identityPlugin` MUST import the `logger` from `@forgekit/shared-observability`.
- **FR-014**: After extracting the identity on each request, if `identity.userId` is `undefined`, the plugin MUST emit a single `logger.debug` call with the structured payload `{ event: 'anonymous_request', path: request.url }`.
- **FR-015**: The `logger.debug` call MUST only fire at `debug` level — not `warn` — to avoid alert fatigue in environments where unauthenticated health checks are frequent. The log level ensures it is invisible in production unless debug logging is explicitly enabled.
- **FR-016**: The log emission MUST NOT block or delay the request. It MUST be called before `done()` but must not be `awaited`.

#### SEC-002 — Unsanitized Details in Operational Error Responses

- **FR-017**: The `toErrorResponse` function MUST NOT attach the raw `error.details` object directly to the response body.
- **FR-018**: The `toErrorResponse` function MUST accept an optional `sanitizeDetails` function parameter with the signature `(details: unknown) => unknown`. If provided, the details object is passed through this function before being attached to the response body.
- **FR-019**: If no `sanitizeDetails` function is provided, the default behavior MUST be to include `details` as-is (preserving backward compatibility for existing callers that control their own details objects).
- **FR-020**: The `errorHandlerPlugin` MUST call `toErrorResponse` with a default sanitizer that performs a safe serialization pass: it converts `details` to a JSON string and back, ensuring that non-serializable values (class instances, functions) are dropped. This ensures DB error objects with prototype methods do not pass through.
- **FR-021**: The complete, unsanitized `error.details` object MUST always be included in the server-side structured log entry emitted by `errorHandlerPlugin`, regardless of what is sent to the client. This ensures diagnostic information is preserved for operators.

#### SEC-006 — DLQ Failure Leaves Message Unacknowledged

- **FR-022**: When `publishToDlq` fails (the `catch` branch is entered), the function MUST call `channel.nack(message, false, false)` before returning `false` to definitively reject the message from the original queue.
- **FR-023**: The `nack` call in the failure path MUST be logged at `warn` level with the payload `{ queue, dlqQueue, err: dlqError }` and the message `'DLQ publish failed — message definitively rejected (nack no-requeue)'`.
- **FR-024**: The existing `logger.error` call that precedes the new `nack` call MUST remain to preserve the error-level visibility of the DLQ publish failure itself.

#### SEC-007 — High-Cardinality Routing Key Label in Prometheus

- **FR-025**: The `messagingPublishedTotal` metric label set MUST be changed from `(serviceName, exchange, routingKey)` to `(serviceName, exchange)`. The `routing_key` dimension MUST be removed from this metric entirely.
- **FR-026**: The `MessagingPublishedLabels` type (or equivalent label type definition in `messaging-metrics.ts`) MUST be updated to remove `routingKey` from the tuple.
- **FR-027**: The `publish` method in `MessagingClientImpl` MUST update its `messagingPublishedTotal.labels(...)` call to pass only `(this.options.serviceName, exchange)`.
- **FR-028**: The change from a 3-label to a 2-label metric constitutes a **breaking change** to the Prometheus metric schema. The metric MUST be renamed from `messaging_published_total` to `messaging_published_total` (no rename needed, but the metric's help text MUST be updated to document the removed label and the effective date, e.g., `'Total messages published (routing_key label removed in spec-011 for cardinality safety)'`). A comment in the code MUST reference `SEC-007` and `spec-011`.

---

### 3. Infrastructure Isolation

#### SEC-012 — Direct Host Exposure of Internal Services

- **FR-029**: The default `docker-compose.yml` (used for development) MUST remove the `ports` mappings for `example-service` (port 3001), `postgres` (port 5432), and `rabbitmq` AMQP port (5672).
- **FR-030**: The RabbitMQ management UI port (15672) MUST also be removed from the default compose file.
- **FR-031**: A new `docker-compose.override.yml` file MUST be introduced in the same `infra/compose/` directory. This file provides opt-in local access to internal services by binding them explicitly to `127.0.0.1` (loopback), preventing exposure to external network interfaces.
- **FR-032**: The `docker-compose.override.yml` MUST NOT be committed to version control for production branches. It MUST be listed in `.gitignore` for environments where the override is auto-generated by tooling. For this project, it IS committed as a developer convenience file and MUST include a prominent comment block stating that it is for local development only and MUST NOT be applied in any staging or production environment.
- **FR-033**: The gateway port (3000) MUST remain exposed in the default `docker-compose.yml` since it is the intended public entry point.
- **FR-034**: The `pnpm boot` script behavior MUST remain unchanged for developers. The Bootstrap script (`scripts/bootstrap/start.js`) relies on Prisma `db:push`, which requires PostgreSQL access. If the script connects to PostgreSQL via the Docker network (container-to-container), no changes to the bootstrap script are required. If it connects via host port, the script MUST be updated to use the override file or connect via the Docker network.

#### SEC-015 — Known Vulnerabilities in Dependency Tree

- **FR-035**: The root `package.json` and all workspace `package.json` files MUST be audited using `pnpm audit` and `pnpm outdated`.
- **FR-036**: The `fastify` dependency in `apps/gateway` and `apps/services/example-service` MUST be upgraded to `>=5.7.3` to resolve the DoS vulnerability identified in the audit.
- **FR-037**: All critical and high-severity vulnerabilities reported by `pnpm audit` MUST be resolved either by upgrading the dependency, applying a `pnpm audit --fix`, or documenting an explicit accepted risk with a rationale comment in a `security-exceptions.md` file at the repo root.
- **FR-038**: The CI workflow (`.github/workflows/ci.yml`) MUST add a `pnpm audit --audit-level=high` step that fails the build if any high or critical vulnerabilities are introduced. This step MUST run before the lint step.

---

## Key Entities

- **Health Endpoint Allowlist**: A compile-time constant array of exact route path strings that are exempt from JWT verification in the gateway. Replaces the fragile substring search.
- **INSECURE_DEV_SECRET**: A named module-level constant holding the fallback JWT secret used exclusively in non-production environments. Making it a named constant prevents accidental copy-paste of the raw string into new code paths.
- **`sanitizeDetails` function**: An optional parameter to `toErrorResponse` that allows the caller (typically `errorHandlerPlugin`) to define how `AppError.details` should be sanitized before inclusion in the HTTP response body.
- **`docker-compose.override.yml`**: A Docker Compose override file that re-exposes internal service ports bound to `127.0.0.1` for local development ergonomics. Isolated from the default compose file to prevent accidental production exposure.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A security reviewer can send `GET /api/example/items?x=/health/live` without an Authorization header and receive HTTP 401 from the gateway.
- **SC-002**: Starting the gateway with `NODE_ENV=production` and no `JWT_SECRET` results in an immediate `process.exit(1)` and a `fatal`-level structured log entry.
- **SC-003**: After `pnpm boot`, `curl http://localhost:3001` and `curl http://localhost:5432` fail from the host machine's network; `curl http://localhost:3000/health/live` succeeds.
- **SC-004**: After applying the override file, `curl http://localhost:3001/health/live` succeeds, confirming the override restores developer access without touching the default compose file.
- **SC-005**: Sending a request to any internal service route without identity headers produces a structured `debug`-level log entry with `event: 'anonymous_request'`.
- **SC-006**: Throwing `dependencyError('fail', { connectionString: 'postgresql://...' })` results in an HTTP response body where `details` does NOT contain `connectionString`, while the server log DOES contain the full `details` object.
- **SC-007**: After deleting the DLQ queue and producing a message that exhausts retries, the consumer log contains a `warn`-level entry for `'DLQ publish failed — message definitively rejected (nack no-requeue)'` and the message does NOT reappear in the consumer.
- **SC-008**: Publishing messages with unique routing key suffixes (e.g., `order.updated.1`, `order.updated.2`) produces a constant number of `messaging_published_total` time series in Prometheus — one per `(service, exchange)` pair.
- **SC-009**: `pnpm audit --audit-level=high` exits with code `0` after dependency upgrades.
- **SC-010**: The gateway HTTP response headers include `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN` for all routes.

---

## Non-Goals

- This specification does NOT introduce rate limiting, request throttling, or DDoS protection mechanisms. These are deferred to a future spec.
- This specification does NOT implement mutual TLS or service-mesh-level authentication between internal services. Network isolation via Docker bridge network is the chosen boundary for this iteration.
- This specification does NOT change the error contract for the `details` field when callers use `toErrorResponse` directly (outside of `errorHandlerPlugin`). Callers that invoke `toErrorResponse` without the sanitizer retain current behavior.
- This specification does NOT define a permission model, claims expansion, or token refresh strategy for the gateway JWT. These are deferred.
- This specification does NOT address observability for CORS rejections or helmet-blocked requests. Logging of these events is left to Fastify's default behavior.

---

## Assumptions

- Fastify v5 or later is used in the gateway. `request.routeOptions.url` is available in Fastify v4+ as well; a version check is not required.
- `@fastify/helmet` and `@fastify/cors` are not yet installed in `apps/gateway`. They MUST be added as production dependencies.
- The `pnpm boot` bootstrap script connects to PostgreSQL from the host for `prisma db push`. If this assumption is incorrect (i.e., it runs inside the container), FR-034 requires no changes to the script.
- `docker-compose.override.yml` is supported natively by Docker Compose v2 without any extra flags.
- The Prometheus instance used by the project is not currently querying `messaging_published_total` in active dashboards. If it is, removing the `routing_key` label constitutes a breaking dashboard change that MUST be communicated to the operator before deployment.

---

## Implementation Order

The items MUST be implemented in the following order to minimize risk and allow incremental verification:

1. **SEC-015** — Upgrade dependencies first. This may resolve some transient issues and ensures subsequent work is done on a stable, up-to-date foundation.
2. **SEC-013** — JWT secret startup guard. Low-risk, self-contained change to `apps/gateway/src/index.ts`. Validates that the gateway can still start in dev before proceeding.
3. **SEC-011** — Auth bypass fix. Modifies the `preHandler` logic. Must be tested immediately after SEC-013 to ensure health endpoints remain accessible.
4. **SEC-008** — Import header constants. Requires SEC-013 and SEC-011 to already have been applied since they touch the same function in `index.ts`. Consolidating into one gateway edit pass is acceptable.
5. **SEC-014** — Add helmet and CORS. Install packages first (`pnpm --filter gateway add @fastify/helmet @fastify/cors`), then register plugins in `buildGateway`.
6. **SEC-001** — Identity plugin debug log. Self-contained change to `packages/shared-security/src/identity-plugin.ts`.
7. **SEC-002** — Error details sanitization. Modifies `packages/shared-error-handling/src/error-response.ts` and `error-handler-plugin.ts`. Must be done after understanding the current plugin structure.
8. **SEC-006** — DLQ nack on failure. Self-contained change to `packages/shared-messaging/src/consumer.ts`.
9. **SEC-007** — Metrics label cardinality. Modifies `packages/shared-messaging/src/messaging-metrics.ts` and `messaging-client.ts`. Done last because it constitutes a schema-breaking change to emitted metrics.
10. **SEC-012** — Docker compose isolation. Infrastructure-only change. Done last to avoid disrupting the development environment during the implementation of items 1–9.

---

## Resolved Design Decisions

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | How to exempt health endpoints from JWT without substring matching? | Use `request.routeOptions.url` compared against a readonly allowlist of exact paths | `routeOptions.url` contains the route pattern (e.g., `/health/live`) without query string, eliminating the bypass vector while remaining explicit and exhaustive. |
| 2 | Should JWT secret absence be a hard crash or a soft warning in production? | Hard crash (`process.exit(1)`) with `logger.fatal` | A server that starts with a known-attacker secret is worse than a server that doesn't start. Operators will be paged by the crash, not by a silent warning. |
| 3 | Should `sanitizeDetails` be required or optional in `toErrorResponse`? | Optional with pass-through default | Making it required would break all existing callers (unit tests, direct usages). Making it optional with pass-through preserves backward compatibility while enabling `errorHandlerPlugin` to enforce sanitization at the HTTP boundary. |
| 4 | What sanitization strategy to use for `details`? | JSON round-trip (`JSON.parse(JSON.stringify(details))`) | Deterministic, zero-dependency, and effectively drops class instances, functions, and circular references. An alternative (allowlist of safe keys) was rejected because it would require per-error-type configuration and would still risk leaking new keys added by future developers. |
| 5 | Should the DLQ failure path use `nack(requeue: false)` or `nack(requeue: true)`? | `nack(requeue: false)` | Requeuing a message that already failed DLQ publish would cause it to be redelivered, reaching max retries again, and hitting the same broken DLQ in a tight loop. Definitive rejection is safer and recoverable through RabbitMQ shovel or manual intervention. |
| 6 | Should `routing_key` be normalized (e.g., truncated, hashed) instead of removed? | Removed entirely from `messaging_published_total` | Normalization strategies (e.g., keep only the first two dot-separated segments) are application-specific and would require configuration. Removal is safe because the exchange label already provides sufficient publisher-side aggregation. The routing key remains available in structured logs and traces. |
| 7 | Should internal Docker ports be removed or just bound to `127.0.0.1` in the default compose? | Removed from default, restored in `docker-compose.override.yml` bound to `127.0.0.1` | Removing ports from the default is the minimal-exposure baseline. The override provides developer ergonomics without changing the default security posture. This matches Docker Compose's intended design for environment-specific overrides. |
| 8 | Should the identity plugin log at `debug` or `warn` for anonymous requests? | `debug` | Health endpoints, webhooks, and public routes legitimately receive requests without identity. Logging at `warn` would flood production logs and trigger false alerts in systems with anonymous public routes. `debug` is invisible in production unless explicitly enabled, making it a "pay only when you need it" diagnostic signal. |
| 9 | Should `pnpm audit` be added to CI as a blocking step? | Yes, blocking at `--audit-level=high` | Critical and high vulnerabilities pose immediate risk. Moderate and low are informational and would block too aggressively. The threshold can be tightened in a future spec when the full vulnerability backlog is cleared. |
