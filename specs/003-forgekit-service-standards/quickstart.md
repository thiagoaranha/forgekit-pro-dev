# ForgeKit Service Standards Quickstart

Use this guide to scaffold, validate, and review a service for spec `003` compliance.

## 1) Prepare Inputs

- Read `spec.md` for mandatory requirements.
- Read `contracts/service-compliance-review.md` for required evidence.
- Read `contracts/standard-error-and-ops.md` for error, health, and metrics baseline.

## 2) Create a New Service from Template

- Run `pnpm scaffold <service-name>` from repository root.
- Confirm generated service includes explicit layered paths:
  - `src/transport/`
  - `src/application/`
  - `src/domain/`
  - `src/infrastructure/`

Expected outcome:

- Generated service starts from a compliant structural baseline.

## 3) Validate Startup and Configuration Contract

- Confirm startup loads config through a schema contract (no direct unvalidated `process.env` reads in runtime path).
- Confirm missing/invalid required config fails startup deterministically.
- Confirm required/optional variables are documented and secret sources are externalized.

Expected outcome:

- Service satisfies externalized config and fail-fast validation expectations.

## 4) Validate Operational Signals and Runtime Behavior

- Verify `GET /health/live` reports process health only.
- Verify `GET /health/ready` reflects serving readiness and dependency impact.
- Verify dependency declarations for readiness include required status and failure effects.
- Verify graceful shutdown flow rejects new work and closes resources safely.
- Verify metrics are exposed for request count, error rate, and latency.

Expected outcome:

- Service exposes consistent liveness/readiness semantics and operational diagnostics.

## 5) Validate Error and Security Baseline

- Verify outward-facing error shape is stable (`code`, `message`, `traceId`).
- Verify unexpected internal failures are sanitized.
- Verify no sensitive data is emitted in logs, responses, traces, or events.
- Verify boundary validation covers external body/query/header/payload input.
- Verify gateway-propagated identity context is consumed and authorization is applied locally.

Expected outcome:

- Service meets secure boundary and standardized error-handling requirements.

## 6) Validate API and Event Contract Compliance

- Verify API contracts are documented before integration.
- Verify external/inter-service API contracts follow explicit versioning.
- Verify success and error response semantics are consistent with documented contracts.
- If producing events, verify event schema/version compatibility rules are documented.
- If consuming events, verify idempotent processing and payload/metadata validation are implemented.

Expected outcome:

- Service interface behavior is predictable and evolution-safe.

## 7) Validate Testing Baseline

- Run `pnpm --filter <service-name> build` and verify successful artifact generation.
- Run `pnpm --filter <service-name> dev` (or equivalent local start command) and verify startup diagnostics.
- Run `pnpm --filter <service-name> test` for service-level test verification.
- Confirm both unit and integration test suites exist.
- Confirm critical business logic has direct tests.
- Confirm coverage reports enforce minimum 80% line coverage.

Expected outcome:

- Service quality gates are measurable and repeatable.

## 8) Record Compliance Decision

- Complete review evidence in `contracts/service-compliance-review.md`.
- Record result as one of:
  - `approved`
  - `approved-with-conditions`
  - `rejected`
- Attach remediation tasks and owners for every failed MUST requirement.

## Example Compliance Walkthrough

1. Scaffold `inventory-service` with `pnpm scaffold inventory-service`.
2. Confirm required layer directories and startup config contract exist.
3. Start service with missing required config and verify fail-fast behavior.
4. Call `/health/live`, `/health/ready`, and `/metrics` and verify expected semantics.
5. Trigger validation failure and confirm standardized error response shape.
6. Run tests and confirm line coverage threshold is met.
7. Complete compliance decision record with evidence links.
