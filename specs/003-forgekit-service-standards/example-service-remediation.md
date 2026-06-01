# Example Service Remediation Backlog (Spec 003 Alignment)

This backlog captures gaps found in `apps/services/example-service/src/` when compared to the updated service-template baseline and spec `003` mandatory requirements.

## Current Gaps

1. No explicit layered folder structure (`transport`, `application`, `domain`, `infrastructure`).
2. Startup uses hardcoded port and host values instead of validated configuration contract.
3. Error responses are not standardized (`code`, `message`, `traceId`) across routes.
4. Request correlation logging uses `reqId` and fallback values that are not aligned with standardized correlation handling.
5. No `/metrics` endpoint with baseline request/error/latency metrics.
6. Readiness response shape does not declare dependency impact in standardized format.

## Follow-up Tasks

- **R1**: Refactor `apps/services/example-service/src/` into explicit layer directories aligned with the template baseline.
- **R2**: Introduce validated startup config contract in `apps/services/example-service/src/infrastructure/config` and remove direct hardcoded runtime values.
- **R3**: Implement shared error handler in transport layer returning standardized error shape.
- **R4**: Introduce correlation ID resolution helper and apply consistent structured log fields.
- **R5**: Add metrics collector and `/metrics` endpoint for request count, error rate, and latency.
- **R6**: Update readiness endpoint to publish dependency status with clear required/non-required semantics.
