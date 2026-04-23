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

## Testing Baseline

- Unit and integration test stubs live under `tests/unit` and `tests/integration`.
- Coverage baseline is enforced in `vitest.config.ts` at 80% minimum line coverage.
- Critical domain logic should be tested directly with deterministic tests.
