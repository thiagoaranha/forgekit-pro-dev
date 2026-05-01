# Observability Implementation Tasks

**Spec Reference**: `008-forgekit-observability`
**Branch**: `feat/008-forgekit-observability`

This document lists the concrete execution tasks required to implement the observability standards defined in Spec 008.

## Epic 1: Shared Observability Enhancements (`packages/shared-observability`)
*Goal: Provide a robust, standardized observability foundation for all ForgeKit services without tying them to a specific APM vendor.*

- [ ] **Task 1.1: Context Propagation Engine**
  - Implement an `AsyncLocalStorage`-based context manager.
  - Create a Fastify hook/middleware that extracts `x-correlation-id` and `traceparent` from incoming requests.
  - Update `getCorrelationId()` to generate a UUIDv4 if no context exists.
  - Provide a `getTraceContext()` helper to retrieve the W3C traceparent.
- [ ] **Task 1.2: Logger Sanitization & Enrichment**
  - Update the `pino` instance to automatically inject the current context's `x-correlation-id` and `traceparent` into every log entry.
  - Configure `pino.redact` with a default denylist (`['*password*', '*token*', '*secret*', '*authorization*']`).
- [ ] **Task 1.3: Metrics Collector (`observabilityPlugin`)**
  - Install `prom-client` as a dependency.
  - Create the `observabilityPlugin` Fastify plugin to track `http_requests_total` and `http_request_duration_seconds`.
  - Expose a `/metrics` route via the plugin.
- [ ] **Task 1.4: Health Check Standards (`healthPlugin`)**
  - Create a `healthPlugin` Fastify plugin.
  - Expose `/health/live` (simple 200 OK process check).
  - Expose `/health/ready` (accepts an array of async ping functions to validate critical dependencies).

## Epic 2: API Gateway Observability (`apps/gateway`)
*Goal: Ensure the API Gateway acts as the central enforcer for traceability.*

- [ ] **Task 2.1: Initial Trace Generation**
  - Update `apps/gateway/src/index.ts` to use the new `AsyncLocalStorage` context manager from `shared-observability`.
  - Ensure any incoming request without an `x-correlation-id` is assigned a new UUIDv4 before proxying to downstream services.
  - Ensure a valid `traceparent` is generated if none is provided.
- [ ] **Task 2.2: Gateway Logging & Metrics**
  - Register the `observabilityPlugin` and `healthPlugin` in the gateway.

## Epic 3: Service Template & Example Implementation
*Goal: Ensure new and existing services are compliant by default.*

- [ ] **Task 3.1: Update `packages/service-template`**
  - Modify `src/index.ts` to register `observabilityPlugin` and `healthPlugin` upon startup.
  - Replace any generic `console.log` or basic Pino instances with the enriched `logger` from `shared-observability`.
- [ ] **Task 3.2: Update `apps/services/example-service`**
  - Apply the same changes as Task 3.1 to the existing example service.
  - Bind a mock database check (e.g., `prisma.$queryRaw`) to the `/health/ready` endpoint.
  - Verify that standard operational metrics are correctly emitted at `/metrics`.

## Epic 4: Verification & Finalization
*Goal: Validate that all acceptance criteria from the spec and planning phases are met.*

- [ ] **Task 4.1: End-to-End Validation**
  - Spin up the local environment (`pnpm boot`).
  - Send requests through the Gateway to the Example Service and verify that logs from both services share the exact same `x-correlation-id`.
  - Verify sensitive data in logs is redacted.
  - Verify `/metrics` and `/health/ready` respond correctly.
- [ ] **Task 4.2: PR and Merge**
  - Generate a Pull Request describing the full observability implementation, referencing the `observability-compliance-review.md` checklist.
