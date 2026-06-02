# Rule: Testing Standards

> Scope: All source code in this monorepo (`apps/**`, `packages/**`).
> Source: Constitution §II.

## Coverage Mandate (NON-NEGOTIABLE)

- **Minimum 80% code coverage** measured across unit and integration tests, per service.
- CI MUST enforce this gate. Builds below 80% MUST fail.
- Coverage reports MUST be generated on every CI run.
- The 80% floor is a minimum, not a target. Critical business logic must reach 100%.

## Test Types

### Unit Tests
- Required for **all business logic**, utility functions, and service-layer code.
- Must run in isolation — no external dependencies (databases, network, other services).
- Use mocks/stubs for external dependencies.
- Must be fast: the full unit suite should complete in seconds.

### Integration Tests
- Required for inter-component communication, database operations, API contracts, and message handling.
- Use `packages/shared-testing` (Testcontainers helper) for real database integration tests.
- Each service integration test must be runnable in isolation using Docker.
- Test file naming: `*.test.ts` for unit tests, `*.integration.test.ts` for integration tests.

## Test Quality Requirements

- **Reliable and deterministic**: Tests MUST produce the same result on every run. Flaky tests are critical defects — fix or delete immediately.
- **No time-dependent assertions**: Do not use `setTimeout` or wall-clock time in test assertions. Control time explicitly.
- **Descriptive test names**: Test names must read as a sentence describing the behavior under test.
  - Good: `"should return 404 when item is not found"`
  - Bad: `"test item not found"`
- **Arrange-Act-Assert (AAA) structure**: Every test must follow this pattern explicitly.
- **One assertion per test** (preferred): When possible, test one behavior per test case for clear failure attribution.

## CI Integration

- All tests must pass before any merge to `main`.
- Test commands: `pnpm test` (all), `pnpm --filter <service> test` (per-service).
- Note: As of current state, test suites are not wired in repo-level CI — this is a known gap to address.

## What to Test First (Priority Order)

1. Critical business logic and data transformations
2. API route handlers (request validation, response format, error handling)
3. Database operations (CRUD, constraint violations, transaction rollback)
4. Inter-service communication contracts
5. Utility and helper functions
