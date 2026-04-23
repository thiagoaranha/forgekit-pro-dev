# Implementation Tasks: ForgeKit Service Template and Implementation Standards

**Branch**: `feat/003-forgekit-service-standards`
**Source Plan**: `plan.md`

## Phase 1: Setup and Planning Artifacts
- [x] **Task 1.1**: Create `specs/003-forgekit-service-standards/contracts/service-compliance-review.md` as the mandatory compliance evidence contract.
- [x] **Task 1.2**: Create `specs/003-forgekit-service-standards/contracts/standard-error-and-ops.md` with standardized error and operational signal expectations.
- [x] **Task 1.3**: Create `specs/003-forgekit-service-standards/research.md` and explicitly document FR-049 (distributed tracing, SHOULD) as deferred from mandatory Phase 1 enforcement.
- [ ] **Task 1.4**: Create `specs/003-forgekit-service-standards/data-model.md` defining compliance entities and evidence relationships.
- [ ] **Task 1.5**: Create `specs/003-forgekit-service-standards/quickstart.md` describing service creation, validation, and review workflow.

## Phase 2: Foundational Template Enforcement (Blocking)
- [x] **Task 2.1**: Refactor `packages/service-template/src/` into explicit layered structure (`transport/`, `application/`, `domain/`, `infrastructure/`).
- [x] **Task 2.2**: Add startup config contract with fail-fast validation in `packages/service-template/src/infrastructure/config/service-config.ts` and consume it from `packages/service-template/src/index.ts` (FR-014, FR-015).
- [x] **Task 2.3**: Implement separated liveness/readiness semantics in `packages/service-template/src/transport/http/routes/health-routes.ts` (FR-051, FR-068, FR-069).
- [x] **Task 2.4**: Implement standardized sanitized error responses (`code`, `message`, `traceId`) in `packages/service-template/src/transport/http/error-handler.ts` (FR-062, FR-066).
- [x] **Task 2.5**: Add baseline metrics emission and `/metrics` endpoint in `packages/service-template/src/infrastructure/metrics/in-memory-metrics.ts` and `packages/service-template/src/transport/http/routes/metrics-routes.ts` (FR-063).
- [ ] **Task 2.6**: Update `scripts/scaffold/index.js` to verify placeholder replacement and generated file set remain correct after template layering changes.

## Phase 3: User Story 1 - Create a Compliant Service Skeleton (Priority: P1)
**Goal**: Guarantee every newly scaffolded service starts compliant with layer boundaries, runtime contract, and baseline operability.

**Independent Test**: Scaffold a new service and verify mandatory layer directories, validated config startup, health endpoints, error contract, and metrics endpoint exist without manual setup.

- [ ] **Task 3.1 [US1]**: Add scaffold validation checks in `scripts/scaffold/index.js` to fail when required template files or directories are missing.
- [ ] **Task 3.2 [US1]**: Add service-template usage notes in `packages/service-template/` (or generated service docs) describing required layer responsibilities and dependency direction.
- [ ] **Task 3.3 [US1]**: Add a compliance walkthrough section in `specs/003-forgekit-service-standards/quickstart.md` showing how to verify a scaffolded service against contracts.

## Phase 4: User Story 2 - Enforce Consistent Implementation Quality (Priority: P2)
**Goal**: Make quality checks objective and repeatable across service reviews.

**Independent Test**: Reviewers can classify a service as compliant/non-compliant using contracts and evidence fields with no language-specific interpretation.

- [ ] **Task 4.1 [US2]**: Expand `specs/003-forgekit-service-standards/contracts/service-compliance-review.md` to map each requirement category to concrete evidence sources (code, tests, logs, docs, runtime signals).
- [ ] **Task 4.2 [US2]**: Add explicit review criteria for validation boundaries, secret handling, sanitized failures, and correlation propagation in `specs/003-forgekit-service-standards/contracts/service-compliance-review.md`.
- [ ] **Task 4.3 [US2]**: Add template test stubs and coverage guidance in `packages/service-template/` to support 80% line coverage expectations in generated services (FR-027..FR-032).
- [ ] **Task 4.4 [US2]**: Document API and event contract compliance expectations in `specs/003-forgekit-service-standards/quickstart.md` using `specs/003-forgekit-service-standards/contracts/standard-error-and-ops.md` as baseline.

## Phase 5: User Story 3 - Standardize Developer and Runtime Behavior (Priority: P3)
**Goal**: Ensure all services behave consistently for run/test/build workflows and operational diagnostics.

**Independent Test**: A developer can run, build, and inspect any service using the documented workflow and verify readiness/liveness, structured logs, metrics, and graceful shutdown behavior.

- [ ] **Task 5.1 [US3]**: Standardize required run/test/build command expectations and verification steps in `specs/003-forgekit-service-standards/quickstart.md`.
- [ ] **Task 5.2 [US3]**: Add readiness dependency declaration guidance and examples in `specs/003-forgekit-service-standards/contracts/standard-error-and-ops.md` and `specs/003-forgekit-service-standards/quickstart.md`.
- [ ] **Task 5.3 [US3]**: Verify `apps/services/example-service/src/` against updated template-aligned standards and create follow-up remediation tasks if mismatches remain.

## Phase 6: Final Review and Gate Checks
- [ ] **Task 6.1**: Validate all planned artifacts from `specs/003-forgekit-service-standards/plan.md` are present and internally consistent.
- [ ] **Task 6.2**: Validate `specs/003-forgekit-service-standards/spec.md` mandatory requirements are covered by at least one artifact in `contracts/`, `quickstart.md`, `data-model.md`, or template enforcement tasks.
- [ ] **Task 6.3**: Run repository validation commands (`pnpm lint`, `pnpm build`) and record any compliance blockers for implementation follow-up.
