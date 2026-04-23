# Service Template Testing Guide

## Test Layout

- `tests/unit`: fast tests for domain and application logic.
- `tests/integration`: contract and adapter tests for transport and infrastructure boundaries.

## Coverage Expectations

- Minimum 80% automated line coverage is required.
- Critical business logic is tested directly regardless of aggregate coverage.
- Flaky and order-dependent tests are not allowed.

## Default Commands

- Run all tests: `pnpm test`
- Watch mode: `pnpm test:watch`

## Suggested Incremental Flow

1. Add or update unit tests for domain/application behavior.
2. Add integration tests for APIs, error semantics, and adapter behavior.
3. Run coverage and close gaps before merging.
