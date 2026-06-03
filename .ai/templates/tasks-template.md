# Tasks: [FEATURE NAME]

**Input**: Design documents from `specs/[###-feature-name]/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories)
**Optional context**: `research.md`, `data-model.md`, `contracts/`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on each other)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure.

- [ ] T001 Create project structure per implementation plan
- [ ] T002 [P] Configure environment variables and schema validation (Zod)
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can begin.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Setup database schema and Prisma migrations
- [ ] T005 [P] Implement authentication/authorization middleware (reuse `@forgekit/shared-security`)
- [ ] T006 [P] Setup Fastify routing and error handling (reuse `@forgekit/shared-error-handling`)
- [ ] T007 Register service in `docs/constitution.md` observability requirements
- [ ] T008 Configure structured logging (reuse `@forgekit/shared-observability`)

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [P] [US1] Unit test for [service/function] in `tests/unit/[name].test.ts`
- [ ] T011 [P] [US1] Integration test for [user journey] in `tests/integration/[name].test.ts`

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create [Entity] type/model in `src/models/[entity].ts`
- [ ] T013 [US1] Implement [Service] in `src/services/[service].ts` (depends on T012)
- [ ] T014 [US1] Implement route handler in `src/routes/[name].ts`
- [ ] T015 [US1] Add input validation and error handling
- [ ] T016 [US1] Add structured logging for this user story's operations

**Checkpoint**: User Story 1 should be fully functional and independently testable.

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 ⚠️

- [ ] T017 [P] [US2] Unit test in `tests/unit/[name].test.ts`
- [ ] T018 [P] [US2] Integration test in `tests/integration/[name].test.ts`

### Implementation for User Story 2

- [ ] T019 [P] [US2] Create [Entity] in `src/models/[entity].ts`
- [ ] T020 [US2] Implement [Service] in `src/services/[service].ts`
- [ ] T021 [US2] Implement route handler in `src/routes/[name].ts`
- [ ] T022 [US2] Integrate with User Story 1 components (if needed)

**Checkpoint**: User Stories 1 AND 2 should both work independently.

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories.

- [ ] TXXX [P] Documentation updates in `docs/`
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX [P] Additional unit tests in `tests/unit/`
- [ ] TXXX Security hardening review against `docs/constitution.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation begins
- Models before services
- Services before route handlers
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All tasks marked [P] within a phase can run concurrently
- Once Foundational phase completes, all user stories can start in parallel
- Different user stories can be worked on in parallel by different team members

---

## Notes

- `[P]` tasks = different files, no dependencies between them
- `[Story]` label maps each task to a specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently before continuing
