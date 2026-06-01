# Implementation Tasks: ForgeKit Architecture Reference

**Branch**: `feat/002-forgekit-architecture`
**Source Plan**: `plan.md`

## Phase 1: Setup and Alignment
- [ ] **Task 1.1**: Confirm `specs/002-forgekit-architecture/spec.md` and `specs/002-forgekit-architecture/plan.md` are aligned with clarified decisions for identity propagation, timeout classes, retry/DLQ policy, schema governance, and HTTP/gRPC default.
- [ ] **Task 1.2**: Create `specs/002-forgekit-architecture/research.md` documenting final governance choices and rationale for architecture enforcement.
- [ ] **Task 1.3**: Create `specs/002-forgekit-architecture/data-model.md` describing architecture governance entities (service boundary declaration, interaction classification, event contract declaration, compliance evidence).

## Phase 2: Foundational Governance Artifacts (Blocking)
- [ ] **Task 2.1**: Create `specs/002-forgekit-architecture/contracts/architecture-review.md` defining mandatory evidence required for architecture approval.
- [ ] **Task 2.2**: Create `specs/002-forgekit-architecture/contracts/interaction-classification.md` defining decision criteria for synchronous, queue-based, and publish/subscribe interactions.
- [ ] **Task 2.3**: Create `specs/002-forgekit-architecture/quickstart.md` describing how engineers apply architecture review artifacts before implementation.
- [ ] **Task 2.4**: Update `specs/002-forgekit-architecture/checklists/requirements.md` notes to reflect that clarify decisions were incorporated into `spec.md`.

## Phase 3: User Story 1 - Define a Standard Service Architecture (Priority: P1)
**Goal**: Enable deterministic architecture review for service boundaries and data ownership.

**Independent Test**: A reviewer can evaluate a proposed service using only `spec.md` and `contracts/architecture-review.md` and decide compliance in 15 minutes.

- [ ] **Task 3.1 [US1]**: Add architecture-review checklist sections in `specs/002-forgekit-architecture/contracts/architecture-review.md` for independent deployability, database ownership, and prohibited cross-service DB access.
- [ ] **Task 3.2 [US1]**: Add review evidence fields in `specs/002-forgekit-architecture/contracts/architecture-review.md` for API/event contract boundaries and service responsibility statements.
- [ ] **Task 3.3 [US1]**: Add reviewer decision rubric in `specs/002-forgekit-architecture/quickstart.md` for pass/fail classification of service-boundary compliance.

## Phase 4: User Story 2 - Standardize Communication Patterns (Priority: P2)
**Goal**: Ensure interaction patterns are selected consistently and justified by use case.

**Independent Test**: A reviewer can classify a flow as synchronous, queue-based async, or publish/subscribe async within 10 minutes.

- [ ] **Task 4.1 [US2]**: Define interaction decision matrix in `specs/002-forgekit-architecture/contracts/interaction-classification.md` with explicit criteria for immediate feedback, fan-out needs, and decoupling requirements.
- [ ] **Task 4.2 [US2]**: Add timeout-class guidance and default values in `specs/002-forgekit-architecture/contracts/interaction-classification.md` for internal read/write and external dependency calls.
- [ ] **Task 4.3 [US2]**: Add protocol-selection guidance in `specs/002-forgekit-architecture/contracts/interaction-classification.md` with HTTP default and gRPC exception criteria.
- [ ] **Task 4.4 [US2]**: Add examples in `specs/002-forgekit-architecture/quickstart.md` showing one synchronous and one asynchronous classification walkthrough.

## Phase 5: User Story 3 - Define Production-Ready Cross-Cutting Rules (Priority: P3)
**Goal**: Enforce resilience, security context propagation, and observability consistency.

**Independent Test**: A reviewer can verify retry/DLQ, identity propagation, and correlation-ID requirements from artifacts without implementation-specific interpretation.

- [ ] **Task 5.1 [US3]**: Add retry policy section in `specs/002-forgekit-architecture/contracts/interaction-classification.md` with retryable/non-retryable classification, max retries, backoff+jitter, and DLQ routing rules.
- [ ] **Task 5.2 [US3]**: Add identity propagation contract in `specs/002-forgekit-architecture/contracts/architecture-review.md` for `x-user-id`, `x-user-roles`, `x-user-permissions`, and async metadata equivalents.
- [ ] **Task 5.3 [US3]**: Add schema governance section in `specs/002-forgekit-architecture/contracts/architecture-review.md` for producer ownership, central compatibility policy, and breaking-change review requirements.
- [ ] **Task 5.4 [US3]**: Add observability verification items in `specs/002-forgekit-architecture/contracts/architecture-review.md` for correlation ID continuity and structured logging context.

## Phase 6: Final Review and Workflow Gates
- [ ] **Task 6.1**: Execute review-spec gate by validating all functional requirements in `specs/002-forgekit-architecture/spec.md` map to at least one review artifact.
- [ ] **Task 6.2**: Execute review-plan gate by validating `specs/002-forgekit-architecture/plan.md` outputs are fully represented in `tasks.md`.
- [ ] **Task 6.3**: Execute pre-implementation review by ensuring `specs/002-forgekit-architecture/research.md`, `specs/002-forgekit-architecture/data-model.md`, `specs/002-forgekit-architecture/quickstart.md`, and `specs/002-forgekit-architecture/contracts/` are complete and reviewable.
