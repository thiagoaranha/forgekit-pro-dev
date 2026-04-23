# Implementation Plan: ForgeKit Service Template and Implementation Standards

**Branch**: `003-forgekit-service-standards` | **Date**: 2026-04-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-forgekit-service-standards/spec.md`

## Summary

Turn spec `003` into an enforceable implementation baseline by defining the compliance model, codifying service-template requirements, and mapping standards to concrete evidence in service reviews.

This plan focuses on operationalizing mandatory service rules (layering, config, security, observability, contracts, tests, and runtime behavior) across the existing monorepo without introducing language or framework lock-in.

## Technical Context

**Language/Version**: Documentation-first planning with current implementation baseline in TypeScript 5.x on Node.js 22 LTS  
**Primary Dependencies**: Existing monorepo stack (Fastify, Zod, Prisma, Pino, pnpm workspaces), Speckit workflow/templates, and existing scaffold/bootstrap scripts  
**Storage**: N/A for planning artifacts; implementation scope references PostgreSQL-backed services where applicable  
**Testing**: Compliance validation through review contracts/checklists plus service-level unit/integration coverage gates (80% minimum)  
**Target Platform**: Repository-wide governance for all current and future ForgeKit services  
**Project Type**: Service-standard governance and template-enforcement feature  
**Performance Goals**: A reviewer can classify service compliance within 15 minutes using standardized evidence, aligned with spec success criteria  
**Constraints**: Preserve architecture spec boundaries, constitution mandates, gateway-auth identity propagation model, correlation ID continuity, and independent service deployability  
**Scale/Scope**: Applies to `packages/service-template`, scaffold output under `apps/services/*`, and review workflows for all services in the monorepo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Clean Code & Readability**: Pass. The plan enforces explicit layer responsibilities, naming quality, and anti-overengineering standards through reviewable criteria.
- **Testing Standards (80% Minimum Coverage)**: Pass. The feature formalizes coverage and test-quality obligations as mandatory compliance evidence.
- **Performance & Concurrency**: Pass. Service runtime standards include non-blocking behavior, graceful shutdown, and dependency-failure handling expectations.
- **Security by Default**: Pass. Configuration validation, secret handling, boundary validation, and sanitized failure behavior are core mandatory rules.
- **Observability & Traceability**: Pass. Structured logging, correlation ID propagation, metrics expectations, and traceability identifiers are explicitly enforced.
- **Microservices Architecture Boundaries**: Pass. Plan aligns with strict layer direction, service boundary discipline, and architecture communication rules.
- **AI-Assisted Development Governance**: Pass. Outputs are compliance artifacts that strengthen human review and approval quality.

No constitution violations are required for this plan.

## Project Structure

### Documentation (this feature)

```text
specs/003-forgekit-service-standards/
|-- plan.md
|-- research.md
|-- data-model.md
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
    `-- <future-scaffolded-services>/

packages/
|-- service-template/
|-- shared-observability/
|-- shared-testing/
`-- shared-tooling/

scripts/
|-- scaffold/
`-- bootstrap/

specs/
|-- 002-forgekit-architecture/
`-- 003-forgekit-service-standards/
```

**Structure Decision**: Keep planning artifacts under `specs/003-forgekit-service-standards/` and use them to drive implementation standards across template, scaffold workflow, and service review processes without changing repository topology in this planning step.

## Phase 0 Research

Research will confirm and document:

- The minimum compliance-evidence model needed to make all mandatory requirements reviewable without relying on implicit team conventions.
- How spec `003` requirements map to existing behavior in `packages/service-template`, `scripts/scaffold`, `apps/gateway`, and `apps/services/example-service`.
- Which standards should be enforced by generated template defaults versus review-time checks versus CI gates.
- The smallest viable contract set required to standardize service structure, configuration contracts, error contracts, logging metadata, and runtime operational endpoints.
- How to preserve technology neutrality while still enforcing objective compliance outcomes.

## Phase 1 Design

### Delivery Slice

The planning slice for spec `003` will define:

- A canonical service-compliance baseline covering layer boundaries, dependency direction, and transport-to-domain mapping rules.
- A configuration and security baseline covering externalized config, startup validation, secret handling, and sensitive-data redaction expectations.
- An observability and runtime baseline covering structured logs, correlation IDs, metrics minimums, readiness/liveness semantics, and graceful shutdown behavior.
- A testing baseline covering mandatory unit/integration scope, deterministic quality rules, and 80% line coverage enforcement expectations.
- An interface-contract baseline for API versioning, input validation, response consistency, standardized error structure, and event handling/idempotency rules.

### Standards Enforcement Model

- **Template conformance**: New scaffolded services must start compliant by default with visible transport/application/domain/infrastructure boundaries.
- **Review conformance**: Implementation reviews must require objective evidence for each mandatory requirement category.
- **Workflow conformance**: Service docs and developer commands must follow a consistent run/test/build/health verification pattern.
- **Operational conformance**: Runtime checks must differentiate liveness vs readiness and include failure diagnostics traceable by request-scoped identifiers.
- **Evolution conformance**: Standards artifacts must support future services without requiring framework-specific assumptions.

### Outputs for Task Generation

- A decision-focused `research.md` resolving enforcement trade-offs and documenting current-gap analysis.
- A `data-model.md` defining compliance entities (service profile, layer boundary evidence, config contract, observability contract, test evidence, API/event contract).
- A `contracts/` set capturing service compliance review contract(s) and standardized error/operational contract expectations.
- A `quickstart.md` describing how engineers create, validate, and review a compliant service implementation.

## Implementation Strategy

1. Consolidate spec `003` mandatory requirements into enforceable compliance dimensions grouped by structure, runtime, security, observability, contracts, and testing.
2. Map each compliance dimension to concrete evidence sources in code, configuration, tests, docs, and runtime signals.
3. Define template and scaffold obligations that make newly generated services compliant-by-default where feasible.
4. Define review contracts/checklists for requirements that cannot be guaranteed solely by template generation.
5. Prepare planning artifacts (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) so `tasks.md` can be generated deterministically.

## Planned Artifacts

- `specs/003-forgekit-service-standards/research.md`: decisions on enforcement approach, current-state gap analysis, and scope boundaries.
- `specs/003-forgekit-service-standards/data-model.md`: compliance entities and review-evidence relationships.
- `specs/003-forgekit-service-standards/quickstart.md`: day-to-day workflow for creating and validating compliant services.
- `specs/003-forgekit-service-standards/contracts/service-compliance-review.md`: required review evidence for mandatory service standards.
- `specs/003-forgekit-service-standards/contracts/standard-error-and-ops.md`: standard error and operational contract expectations.
- `specs/003-forgekit-service-standards/tasks.md`: phase-2 execution tasks generated from this plan.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
