# Observability Compliance Review Contract

**Spec Reference**: `008-forgekit-observability`
**Applies To**: All ForgeKit services (Gateways, API Services, Background Workers)

This checklist MUST be verified by a reviewer before approving any Pull Request that creates a new service or modifies the observability structure of an existing service.

## 1. Traceability & Correlation
- [ ] **Tracing Startup**: The service calls `initializeTracing` exactly once during startup before request handling or background processing begins.
- [ ] **Sampling Strategy**: Development/test sampling is 100%; production sampling is documented and configurable.
- [ ] **Context Injection**: The service correctly uses `observabilityPlugin` (or equivalent) to initialize context for incoming requests.
- [ ] **Context Propagation (HTTP)**: Outbound HTTP calls explicitly pass the `x-correlation-id` and `traceparent` headers.
- [ ] **Context Propagation (Async)**: Published events/messages explicitly attach the correlation and trace contexts in their metadata.
- [ ] **Span Coverage**: Incoming requests, meaningful operations, dependency calls, and consumed messages create spans or equivalent trace segments.

## 2. Structured Logging & Sanitization
- [ ] **Logger Usage**: The service strictly uses the standardized `logger` from `@forgekit/shared-observability` (no `console.log`).
- [ ] **Sanitization**: The service does NOT log sensitive variables. If custom sensitive fields are processed, the local Pino `redact` configuration is updated.
- [ ] **Meaningful Levels**: Log levels are used correctly (`info` for state, `warn` for retryable/invalid inputs, `error` for hard failures).
- [ ] **Error Context**: All `error` logs include the original error stack/object and relevant sanitized contextual metadata.

## 3. Metrics
- [ ] **Metrics Endpoint**: The service exposes a `/metrics` route (handled automatically if using `observabilityPlugin`).
- [ ] **Custom Metrics Integrity**: Any custom business metrics registered do NOT contain unbounded high-cardinality labels (e.g., raw user input).
- [ ] **Normalized Labels**: Operation and dependency labels are stable names and never include IDs, user-specific data, request bodies, full URLs, or raw external input.

## 4. Health & Readiness
- [ ] **Liveness**: The service exposes a `/health/live` route that strictly validates process health, independent of external systems.
- [ ] **Readiness**: The service exposes a `/health/ready` route.
- [ ] **Dependency Ping**: If the service relies on databases or external APIs for core synchronous behavior, those dependencies are checked within the `/health/ready` handler.

## 5. Messaging & Boundaries
- [ ] **Message Failure Context**: Message processing failures are logged with correlation and trace context.
- [ ] **Retry/DLQ Integration**: Broker-specific retry or dead-letter handling is wired where applicable.
- [ ] **No Domain Leakage**: Shared observability plugins remain cross-cutting only and do not contain business logic or service-specific domain behavior.
