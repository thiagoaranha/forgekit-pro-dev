# Implementation Plan: ForgeKit System Overview

**Branch**: `004-forgekit-overview-plan` | **Date**: 2026-04-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-forgekit-overview/spec.md`

## Summary

Deliver the first runnable ForgeKit baseline as a backend-focused monorepo that boots locally in under 10 minutes and demonstrates the starter kit's core value: a single bootstrap command, one API Gateway, one example domain service, supporting local infrastructure, health checks, structured logging with correlation IDs, CI quality gates, and a service scaffolding command.

This plan is intentionally limited to the outcomes defined in spec `001`. It establishes the first production-oriented implementation slice of ForgeKit and leaves deeper architecture expansion and service-level implementation standardization to follow-on planning and task generation.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS  
**Primary Dependencies**: Fastify, Zod, Pino, OpenTelemetry SDK, Prisma, amqplib or framework-equivalent RabbitMQ client, Vitest, Testcontainers, pnpm workspace tooling  
**Storage**: PostgreSQL per service for local development; RabbitMQ as asynchronous messaging backbone; filesystem for local templates/docs artifacts  
**Testing**: Vitest for unit/integration tests, Testcontainers for infrastructure-backed integration tests, coverage enforcement in CI  
**Target Platform**: Linux containers for runtime; local development on macOS, Linux, and Windows with Docker Desktop or compatible runtime  
**Project Type**: Backend monorepo starter kit with gateway, services, template tooling, and developer automation  
**Performance Goals**: Local bootstrap completes and reaches healthy state in under 10 minutes (measured with Docker images pre-pulled on a standard developer workstation with 4+ cores and 8+ GB RAM); health endpoints respond in under 500 ms locally; scaffold command completes in under 5 minutes  
**Constraints**: 80% minimum automated line coverage; structured logs with correlation ID; no secrets committed; services independently runnable/buildable/testable; local bootstrap must require minimal manual setup  
**Scale/Scope**: Initial implementation includes one API Gateway, one example service, one service template/scaffolder, CI template, local orchestration, and baseline docs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Clean Code & Readability**: Pass. The planned monorepo keeps responsibilities separated across gateway, services, shared operational tooling, and scaffolding assets. No speculative platform layers are introduced.
- **Testing Standards (80% Minimum Coverage)**: Pass. The plan includes unit and integration testing, CI coverage enforcement, and generated boilerplate tests for scaffolded services.
- **Performance & Concurrency**: Pass. The selected stack is non-blocking by default and supports async request handling and messaging.
- **Security by Default**: Pass. Configuration is externalized, secrets remain outside source control, boundary validation is required, and the gateway handles authentication.
- **Observability & Traceability**: Pass. Structured logs, correlation ID propagation, health endpoints, and metrics/tracing hooks are part of the baseline deliverable.
- **Microservices Architecture Boundaries**: Pass. The initial slice includes API Gateway, independently runnable service(s), message broker, and database-per-service boundaries.
- **AI-Assisted Development Governance**: Pass. No special exception required.

No constitution violations are required for this plan.

## Project Structure

### Documentation (this feature)

```text
specs/001-forgekit-overview/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── gateway/
└── services/
    └── example-service/

packages/
├── service-template/
├── shared-observability/
├── shared-testing/
└── shared-tooling/

infra/
├── docker/
└── compose/

scripts/
├── bootstrap/
└── scaffold/

docs/
├── constitution.md
├── architecture/
├── developer/
└── operations/

.github/
└── workflows/
```

**Structure Decision**: Use a backend monorepo with isolated applications under `apps/`, reusable starter assets and narrowly-scoped tooling under `packages/`, local infrastructure definitions under `infra/`, automation entrypoints under `scripts/`, and end-user/operator documentation under `docs/`. This keeps the initial slice bootstrapable while preserving independent service boundaries.

## Phase 0 Research

Research will confirm the following implementation choices before task generation:

- The exact local orchestration approach for the single bootstrap command, with Docker Compose as the default baseline unless a simpler equivalent proves superior.
- The authentication baseline for local development, using JWT-based token validation at the API Gateway with a lightweight development issuer. Research must confirm the token generation mechanism (script or development endpoint), the claim structure for identity propagation (subject identifier, roles), and the header format for passing identity context to downstream services. This baseline is for development and demonstration only and must be replaceable with a production identity provider without changes to service-level authentication logic.
- The scaffolding mechanism, favoring template-driven generation through repository-local scripts over a plugin framework or external generator dependency. Research must also determine the auto-integration strategy: how the scaffold command will register the new service in Docker Compose (or equivalent), add development routes in the API Gateway, and ensure CI discovers the service through convention rather than manual workflow edits.
- The minimum shared package set allowed without violating service-boundary goals.
- The CI baseline for linting, tests, coverage, and security scanning on GitHub Actions, including the convention-based service discovery mechanism that allows scaffolded services to be included without manual workflow modifications. Security scanning MUST include at minimum dependency vulnerability scanning and secret detection; additional static analysis tooling MAY be added during implementation.

## Phase 1 Design

### Delivery Slice

The first implementation slice for spec `001` will include:

- One API Gateway as the external entrypoint.
- One example service that demonstrates health checks, structured logging, validation, independent run/build/test behavior, and at least one functional API flow.
- One local PostgreSQL instance owned by the example service.
- One RabbitMQ instance to prove asynchronous capability, even if the first user flow remains minimal.
- One bootstrap command that builds and starts the full local stack.
- A lightweight JWT-based authentication baseline for local development, including a development token issuer and a mechanism to generate valid tokens for local testing (e.g., a script or development endpoint). This baseline is intended for development and demonstration only and MUST NOT be considered production-ready.
- One scaffolding command that creates a new service from the approved baseline template, producing a fully compliant ForgeKit service from the moment of creation. The scaffold command MUST also automatically integrate the new service into the local development environment by registering it in Docker Compose (or equivalent local orchestration), adding it to the API Gateway development routing configuration, and ensuring CI discovers it through convention-based discovery. The scaffold command MUST NOT perform production environment configuration or infrastructure provisioning.
- One CI workflow template that runs linting, tests, coverage, and security scanning.
- Documentation sufficient for bootstrap, evaluation, and service creation.
- The initial slice MUST include at least one functional API flow (for example, create and retrieve a resource) to demonstrate end-to-end request handling through the gateway and service.

### Service Boundaries

- `gateway`: handles routing, JWT-based authentication enforcement (validating development-issued tokens), identity claim propagation (subject identifier, roles) to downstream services, correlation ID propagation, and cross-cutting HTTP concerns. The gateway MUST reject requests with missing, expired, or invalid tokens on protected routes.
- `example-service`: owns one bounded domain capability and one private database schema; exposes health endpoints and at least one representative API path supporting a functional end-to-end flow through the gateway.
- `service-template`: contains the golden service starter used by the scaffold command. The template MUST produce a fully compliant service including: (a) a layered structure with explicit transport, application, domain, and infrastructure separation; (b) a configuration contract with externalized, environment-aware loading and fail-fast validation; (c) structured logging setup with correlation ID propagation; (d) a test suite with unit and integration test stubs meeting the 80% coverage baseline; (e) liveness and readiness health check endpoints; (f) a CI-ready project structure that passes all quality gates without manual configuration; and (g) graceful shutdown behavior that rejects new work, completes in-flight operations within defined limits, and closes resources safely. The scaffold process MUST also register the new service in Docker Compose, add development routes in the gateway, and ensure CI convention-based discovery.
- `shared-observability`: contains only baseline operational primitives that do not create domain coupling, such as correlation ID utilities, logger bootstrap, and metrics/tracing setup.
- `shared-testing`: contains test helpers and reusable fixtures that support consistent testing without embedding domain logic.
- `shared-tooling`: contains narrowly scoped developer tooling helpers used by scripts or CI.
- Services MAY depend on shared workspace packages that provide cross-cutting concerns (e.g., observability, testing utilities, tooling), provided these packages do not introduce domain coupling. Shared packages MUST remain limited to cross-cutting concerns and MUST NOT include domain logic or create coupling between services.

### Operational Baseline

- Every runnable service must expose readiness and liveness endpoints.
- Every service must emit structured logs with timestamp, service name, level, message, and correlation ID.
- Every service must validate configuration on startup and fail fast on invalid or missing required settings.
- The bootstrap command must surface prerequisite failures clearly and stop with actionable diagnostics.
- The scaffolding command must accept at minimum a service name as input; additional parameters, defaults, and optional flags must be defined in the scaffold command contract. The command must reject a service name if a directory with that name already exists under the services directory (e.g., `apps/services/`) and generate a fully compliant service directory containing a layered project structure (transport, application, domain, infrastructure), a validated configuration contract, structured logging with correlation IDs, liveness and readiness health endpoints, graceful shutdown behavior, a test suite meeting the 80% coverage baseline, CI-compatible structure, and boilerplate documentation. The scaffold command must also automatically register the new service in Docker Compose (or equivalent local orchestration), add development routing entries in the API Gateway, and ensure the service is discovered by CI through convention-based patterns without manual workflow edits. The scaffold command must not perform production environment configuration or infrastructure provisioning.
- Every service must be independently runnable, meaning it can be built, started, and tested in isolation without requiring other domain services. Services MUST NOT require other services to be running in order to start, pass health checks, or execute their primary functionality. External infrastructure dependencies such as databases or message brokers MAY be required and are considered part of the service's runtime environment, not service coupling. Services MAY depend on shared workspace packages for cross-cutting concerns, provided those packages do not introduce domain coupling.

### Data and Contracts

- The example service owns its persistence schema and exposes only its own API contract.
- Gateway-to-service communication is synchronous HTTP in the initial slice.
- The first slice contract must prove at least one end-to-end API workflow, such as creating and retrieving a resource through the gateway and example service.
- Asynchronous messaging is present in the baseline stack so event publication and consumption can be added without redesigning local infrastructure.
- Contract artifacts for the first slice should include the example service API contract, health endpoint expectations, and scaffold command input/output expectations.

## Implementation Strategy

1. Establish repository skeleton for applications, packages, infrastructure, scripts, docs, and workflows.
2. Implement local orchestration and bootstrap command for gateway, example service, PostgreSQL, and RabbitMQ.
3. Implement gateway and example service baseline with health checks, validation, structured logging, and correlation ID propagation.
4. Add shared observability/testing/tooling primitives that reduce repetition without coupling service domains.
5. Implement the service scaffolding command from the approved service template baseline. The scaffold output MUST produce a fully compliant service including: layered structure (transport/application/domain/infrastructure), configuration contract with fail-fast validation, structured logging with correlation ID propagation, test suite with unit and integration stubs meeting 80% coverage, liveness and readiness health endpoints, graceful shutdown behavior, and CI-ready project layout. The scaffold command MUST also auto-register the new service in Docker Compose (or equivalent), add development routes in the API Gateway, and ensure CI convention-based discovery. The scaffold command MUST NOT perform production environment configuration or infrastructure provisioning.
6. Add CI workflow template with lint, test, coverage, dependency vulnerability scanning, secret detection, and additional security scan gates.
7. Write quickstart and evaluation docs so bootstrap and review flows are demonstrable end-to-end.

## Planned Artifacts

- `specs/001-forgekit-overview/research.md`: final decisions for bootstrap orchestration, auth baseline, scaffolding approach, shared package policy, and CI baseline.
- `specs/001-forgekit-overview/data-model.md`: ForgeKit project, service template, service descriptor, bootstrap configuration, and generated service metadata.
- `specs/001-forgekit-overview/quickstart.md`: local run instructions, expected health checks, and scaffold flow.
- `specs/001-forgekit-overview/contracts/`: bootstrap command contract, scaffold command contract, and example service API contract.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
