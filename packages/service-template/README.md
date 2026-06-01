# ForgeKit Service Template

This template is the baseline used by `pnpm scaffold <service-name>`.

## Required Layer Responsibilities

- `src/transport/`: protocol handlers, boundary validation, request/response mapping, metadata propagation.
- `src/application/`: use-case orchestration and coordination of domain and infrastructure dependencies.
- `src/domain/`: business rules and invariants independent from transport and infrastructure concerns.
- `src/infrastructure/`: technical adapters (configuration, persistence, observability, external clients).

## Dependency Direction Rules

- Dependencies flow inward: `transport` -> `application` -> `domain`.
- `infrastructure` may implement adapters consumed by `application` but domain code remains framework-agnostic.
- Domain modules must not import transport, persistence, broker, or framework-specific runtime APIs.

## Runtime Compliance Baseline

- Configuration must load through a schema contract and fail fast on invalid values.
- Error responses must use the standard shape: `code`, `message`, `traceId`.
- Liveness and readiness endpoints must remain semantically distinct.
- Metrics endpoint must expose request count, error rate, and latency signals.
- Tracing must be initialized once at startup before serving requests or processing background work.
- Operation and dependency telemetry labels must be normalized stable names, never IDs or user-specific data.

## Health Semantics

- Liveness (`/health/live`): process health only; it must not call databases, brokers, or external APIs.
- Readiness (`/health/ready`): traffic readiness; add required synchronous dependencies to `readinessChecks`.
- Scaffolded services start with no critical readiness dependencies. Before production, document each dependency that affects readiness in the service README.

## Testing Baseline

- Unit and integration test stubs live under `tests/unit` and `tests/integration`.
- Coverage baseline is enforced in `vitest.config.ts` at 80% minimum line coverage.
- Critical domain logic should be tested directly with deterministic tests.
