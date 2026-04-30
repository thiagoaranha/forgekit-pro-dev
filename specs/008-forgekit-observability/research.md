# Observability Research & Gap Analysis

**Feature Branch**: `008-forgekit-observability`
**Date**: 2026-04-30

## Overview

This document analyzes the current state of observability in the ForgeKit monorepo compared against the requirements defined in `spec.md`. The goal is to define the exact mechanisms for correlation ID propagation, trace context propagation, log sanitization, and metrics standardisation.

## Current State vs. Spec Requirements

### 1. Correlation IDs and Trace Context
**Requirement:** Gateway MUST generate UUIDv4 correlation IDs (`x-correlation-id`) if missing. Trace context (W3C `traceparent`) must also be propagated.
**Current State:** 
- `apps/gateway/src/index.ts` sets `x-correlation-id` via `getCorrelationId()` from `shared-observability` if missing.
- `packages/shared-observability/src/index.ts` implements `getCorrelationId()` but returns a static placeholder: `'req-uuid-placeholder'`.
- There is zero awareness of OpenTelemetry or W3C `traceparent` headers across the monorepo.
**Gap to Close:**
- Upgrade `getCorrelationId()` to generate a proper UUIDv4.
- Implement Fastify middlewares in `shared-observability` to parse, inject, and validate `traceparent` alongside `x-correlation-id`.

### 2. Structured Logging and Sanitization
**Requirement:** Logs must be structured JSON, including `service`, `level`, `timestamp`, and the correlation ID. `debug` level must be supported but off by default in production. Sensitive fields MUST be sanitized.
**Current State:**
- `packages/shared-observability/src/index.ts` provides a `pino` logger.
- It defaults to `info` via `process.env.LOG_LEVEL`.
- It formats time to ISO strings and level names correctly.
- Correlation IDs are NOT automatically attached to log entries (no `AsyncLocalStorage` or equivalent).
- No sanitization logic (allowlist/denylist) exists.
**Gap to Close:**
- Introduce `AsyncLocalStorage` (via `pino-http` or custom interceptor) so every log implicitly inherits the request's `x-correlation-id` and `traceparent`.
- Implement `pino.redact` (denylist approach is natively supported by Pino) to strip common sensitive fields (`password`, `token`, `secret`, `authorization`).

### 3. Metrics
**Requirement:** Services MUST capture request count, error count/rate, and latency (average/percentile) and expose a metrics endpoint.
**Current State:**
- No metrics capabilities exist in the monorepo.
**Gap to Close:**
- Introduce a standardized metric collector to `shared-observability` (e.g., `prom-client` for Prometheus compatibility).
- Provide a Fastify plugin that automatically captures endpoint latency, status codes, and exposes a `/metrics` route.

### 4. Health Signals (Liveness & Readiness)
**Requirement:** Differentiate Liveness (process health) from Readiness (synchronous dependency health).
**Current State:**
- Services have a `/health` endpoint but it's typically a simple `200 OK` liveness check.
- Readiness checks mapped to database (Prisma) or external APIs do not exist systematically.
**Gap to Close:**
- Define a standard `/health/live` and `/health/ready` pattern in `shared-observability` that services can adopt, where `/ready` accepts a list of dependency ping functions.

## Implementation Decisions

### Decision 1: Context Propagation Mechanism
We will use Node.js `AsyncLocalStorage` inside a Fastify hook provided by `shared-observability`. This hook will:
1. Extract `x-correlation-id` and `traceparent` from headers.
2. Generate UUIDv4 for `x-correlation-id` if absent.
3. Generate a new `traceparent` if absent.
4. Set them in local storage.
The Pino logger will be configured with a mixin that automatically pulls these values from `AsyncLocalStorage` and appends them to every log payload.

### Decision 2: Sanitization Strategy
We will use Pino's native `redact` feature. `shared-observability` will export a default denylist (e.g., `['req.headers.authorization', 'password', 'token', 'secret', '*.password']`) but allow services to extend it. This fulfills the `FR-031` and `FR-032` requirements for a consistent shared utility.

### Decision 3: Metrics Library
We will use `prom-client` within `shared-observability`. It satisfies the spec without heavy lock-in, as Prometheus format is the industry standard metrics exposition format. The plugin will track `http_requests_total` and `http_request_duration_seconds`.

## Next Steps
The next step is to codify these decisions into the `quickstart.md` guide and formalize the review criteria in `contracts/observability-compliance-review.md`.
