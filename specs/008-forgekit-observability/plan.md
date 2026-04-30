# Implementation Plan: ForgeKit Observability Standards

**Branch**: `008-forgekit-observability` | **Date**: 2026-04-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-forgekit-observability/spec.md`

## Summary

Turn spec `008` into an enforceable implementation baseline by defining the compliance model, codifying observability requirements (logs, metrics, traces, health signals), and mapping standards to concrete evidence in service reviews.

This plan focuses on operationalizing mandatory observability rules (correlation ID propagation, trace context, structured logging, sanitization, metrics minimums, and readiness/liveness semantics) across the existing monorepo without introducing lock-in to specific observability vendors.

## Technical Context

**Language/Version**: Documentation-first planning with current implementation baseline in TypeScript 5.x on Node.js 22 LTS  
**Primary Dependencies**: Existing monorepo stack (Fastify, Zod, Pino logger, pnpm workspaces), Speckit workflow/templates, and `packages/shared-observability`  
**Storage**: N/A for planning artifacts; implementation scope references PostgreSQL-backed services where applicable  
**Testing**: Compliance validation through review contracts/checklists plus service-level unit/integration tests  
**Target Platform**: Repository-wide governance for all current and future ForgeKit services  
**Project Type**: Observability-standard governance and template-enforcement feature  
**Performance Goals**: A reviewer can classify service observability compliance within 15 minutes using standardized evidence, aligned with spec success criteria  
**Constraints**: Preserve architecture spec boundaries, gateway identity propagation model, and independent service deployability while enforcing unified correlation ID and trace contexts  
**Scale/Scope**: Applies to `packages/service-template`, `packages/shared-observability`, scaffold output under `apps/services/*`, and review workflows for all services in the monorepo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Clean Code & Readability**: Pass. The plan enforces explicit log levels, clear metric naming, and structured logging formats.
- **Testing Standards (80% Minimum Coverage)**: Pass. Feature aligns with test-quality obligations.
- **Performance & Concurrency**: Pass. The plan accounts for performance constraints (e.g., avoiding high-cardinality metrics, enabling trace sampling).
- **Security by Default**: Pass. Sanitization of logs and metrics is a core mandatory rule to prevent sensitive data leaks.
- **Observability & Traceability**: Pass. This is the core focus of the plan. Structured logging, correlation ID (UUIDv4) propagation, OpenTelemetry trace contexts, and metrics expectations are explicitly enforced.
- **Microservices Architecture Boundaries**: Pass. Plan aligns with strict boundary discipline and correlation propagation across synchronous and asynchronous communication.
- **AI-Assisted Development Governance**: Pass. Outputs are compliance artifacts that strengthen human review and approval quality.

No constitution violations are required for this plan.

## Project Structure

### Documentation (this feature)

```text
specs/008-forgekit-observability/
|-- plan.md
|-- research.md
|-- quickstart.md
|-- contracts/
`-- tasks.md
```

### Source Code (repository root)

```text
apps/
|-- gateway/
`-- services/
    |-- example-service/

packages/
|-- service-template/
`-- shared-observability/

specs/
|-- 002-forgekit-architecture/
|-- 003-forgekit-service-standards/
`-- 008-forgekit-observability/
```

**Structure Decision**: Keep planning artifacts under `specs/008-forgekit-observability/` and use them to drive observability implementation standards across the template, scaffold workflow, and service review processes without changing repository topology in this planning step.

## Phase 0 Research

Research will confirm and document:

- The minimum compliance-evidence model needed to make all mandatory observability requirements reviewable without relying on implicit team conventions.
- How spec `008` requirements map to existing behavior in `packages/shared-observability`, `packages/service-template`, `apps/gateway`, and `apps/services/example-service`.
- How to propagate UUIDv4 `x-correlation-id` and W3C `traceparent` contexts consistently across HTTP requests and message brokers (e.g., RabbitMQ).
- The strategy for log sanitization (allowlist vs. denylist) and how it integrates with `Pino` logger in `shared-observability`.
- How to preserve technology neutrality while ensuring distributed tracing sampling, liveness, and readiness semantics are objective.

## Phase 1 Design

### Delivery Slice

The planning slice for spec `008` will define:

- A canonical observability baseline covering correlation IDs, trace contexts, structured logging (JSON), metric dimensions, and health endpoint semantics.
- A log sanitization and formatting baseline covering the handling of sensitive fields, error stack traces, contextual metadata, and log levels (`info`, `warn`, `error`, `debug`).
- A correlation propagation baseline covering API Gateway initialization and preservation across synchronous/asynchronous boundaries.
- A metrics baseline covering request/operation counts, error rates, and latency percentiles per service/operation.
- A health check baseline distinguishing liveness (process health) from readiness (synchronous dependency health).

### Standards Enforcement Model

- **Template conformance**: New scaffolded services must start compliant by default with pre-configured observability utilities (`shared-observability`).
- **Review conformance**: Implementation reviews must require objective evidence that logs, metrics, and traces are connected via shared contexts.
- **Workflow conformance**: Gateway must generate UUIDv4 correlation IDs and validate incoming contexts.
- **Operational conformance**: Runtime checks must differentiate liveness vs readiness correctly.
- **Evolution conformance**: Standards artifacts must support future services without requiring a specific APM vendor lock-in.

### Outputs for Task Generation

- A decision-focused `research.md` resolving propagation trade-offs, sanitization strategies, and gap analysis against current `shared-observability`.
- A `contracts/` set capturing the observability compliance review contract(s) and standardized telemetry expectations.
- A `quickstart.md` describing how engineers implement, validate, and verify correlation IDs, logs, metrics, and health checks in their services.

## Implementation Strategy

1. Consolidate spec `008` mandatory requirements into enforceable compliance dimensions grouped by Logging, Metrics, Tracing, and Health Signals.
2. Map each compliance dimension to concrete evidence sources in code, configuration, and runtime signals.
3. Define the enhancements required for `packages/shared-observability` to support UUIDv4 generation/validation, trace context, and log sanitization.
4. Define template obligations that make newly generated services compliant-by-default for logging, metrics, and health checks.
5. Define review contracts/checklists for requirements that cannot be guaranteed solely by library defaults.
6. Prepare planning artifacts (`research.md`, `contracts/`, `quickstart.md`) so `tasks.md` can be generated deterministically.

## Planned Artifacts

- `specs/008-forgekit-observability/research.md`: decisions on propagation mechanisms, sanitization strategies, and current-state gap analysis.
- `specs/008-forgekit-observability/quickstart.md`: day-to-day workflow for ensuring observability compliance during service development.
- `specs/008-forgekit-observability/contracts/observability-compliance-review.md`: required review evidence for mandatory observability standards.
- `specs/008-forgekit-observability/tasks.md`: phase-2 execution tasks generated from this plan.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
