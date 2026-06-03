# Skill: ForgeKit Spec-Driven Development (SDD) Workflow

## Purpose

This skill defines the complete Spec-Driven Development cycle for the ForgeKit monorepo. It replaces the former SpecKit CLI workflow and provides the AI with the exact steps, documents, and guardrails for each phase of feature development.

All features MUST go through this workflow. The AI MUST NOT skip phases or begin implementation without the preceding documents being in place.

---

## Trigger Phrases

| Phrase | Phase |
|---|---|
| *"Create a new spec for [feature]"* / *"Specify [feature]"* | `sdd.specify` |
| *"Create the plan for [feature]"* / *"Plan [feature]"* | `sdd.plan` |
| *"Generate tasks for [feature]"* / *"Break down [feature] into tasks"* | `sdd.tasks` |
| *"Implement [feature]"* / *"Start implementing [feature]"* | `sdd.implement` |
| *"Generate a checklist for [feature]"* | `sdd.checklist` |

---

## Phase 0: Auto-detect Next Spec Number

Before any `sdd.specify` invocation, the AI MUST determine the next sequential spec number by:

1. Listing all directories under `specs/` that match the pattern `NNN-*` (e.g., `001-forgekit-overview`).
2. Extracting the numeric prefix from each directory name.
3. Incrementing the highest number found by 1 (zero-padded to 3 digits).

**Example**: If `specs/` contains `001` through `011`, the next spec is `012`.

---

## Phase 1: `sdd.specify` — Feature Specification

**Purpose**: Capture requirements, user stories, and acceptance criteria before any design or code.

**Prerequisites**: None — this is always the first step.

### Steps

1. **Determine spec number** — run Phase 0 auto-detection.
2. **Create branch** (if not already on a feature branch):
   ```
   git checkout -b feat/[NNN]-[kebab-case-feature-name]
   ```
3. **Create the spec directory**:
   ```
   specs/[NNN]-[feature-name]/
   ```
4. **Create `spec.md`** using `.ai/templates/spec-template.md` as the structure reference.
   - Fill in all mandatory sections: User Scenarios, Requirements, Success Criteria, Assumptions.
   - Assign priorities (P1, P2, P3) to every user story.
   - Mark unclear requirements with `[NEEDS CLARIFICATION: reason]`.
5. **Present the spec** to the user for review and approval before proceeding.

### Output

```
specs/[NNN]-[feature-name]/
└── spec.md
```

---

## Phase 2: `sdd.plan` — Implementation Plan

**Purpose**: Translate the specification into a concrete technical design.

**Prerequisites**: `specs/[NNN]-[feature-name]/spec.md` MUST exist and be approved.

### Steps

1. Read `spec.md` in full.
2. Read `docs/constitution.md` — the plan MUST comply with all principles.
3. **Create `plan.md`** using `.ai/templates/plan-template.md` as structure reference.
   - Fill in: Summary, Technical Context, Project Structure, Complexity Tracking (if needed).
4. **Execute Constitution Check** (from `.ai/skills/constitution-check.skill.md`) — all gates must pass.
   - Document any violations in the Complexity Tracking table with justification.
5. Optionally create supporting docs in the same directory:
   - `research.md` — background research or technology comparisons
   - `data-model.md` — entity/schema design
   - `contracts/` — API contract fragments
   - `quickstart.md` — how to run/validate the feature locally
6. **Present the plan** to the user for review and approval before proceeding.

### Output

```
specs/[NNN]-[feature-name]/
├── spec.md      (existing)
├── plan.md      (new)
├── research.md  (optional)
└── data-model.md (optional)
```

---

## Phase 3: `sdd.tasks` — Task Breakdown

**Purpose**: Decompose the implementation plan into atomic, independently-executable tasks.

**Prerequisites**: `specs/[NNN]-[feature-name]/plan.md` MUST exist and be approved.

### Steps

1. Read `spec.md` (for user stories and priorities).
2. Read `plan.md` (for technical structure and constraints).
3. Read any supporting docs (`data-model.md`, `contracts/`) if they exist.
4. **Create `tasks.md`** using `.ai/templates/tasks-template.md` as structure reference.
   - Group tasks by user story (US1, US2, US3...) to enable independent delivery.
   - Include a Foundational phase (blocking prerequisites) before any user story work.
   - Mark parallelizable tasks with `[P]`.
   - Include test tasks FIRST within each story (tests must fail before implementation).
   - Use exact file paths for every task.
5. **Present tasks.md** to the user for review and approval before implementation begins.

### Output

```
specs/[NNN]-[feature-name]/
├── spec.md    (existing)
├── plan.md    (existing)
└── tasks.md   (new)
```

---

## Phase 4: `sdd.implement` — Implementation

**Purpose**: Execute the tasks in order, respecting dependencies and checkpoints.

**Prerequisites**: `specs/[NNN]-[feature-name]/tasks.md` MUST exist and be approved.

### Steps

1. Read `spec.md`, `plan.md`, and `tasks.md` in full before writing a single line of code.
2. Load the relevant `.ai/rules/` files:
   - `.ai/rules/code-style.md` — always
   - `.ai/rules/testing.md` — always
   - `.ai/rules/api-conventions.md` — if HTTP handlers are involved
   - `.ai/rules/service-architecture.md` — if a new service or shared package is involved
3. Execute tasks in order:
   - **Phase 1 (Setup)** → **Phase 2 (Foundational)** → **User Story phases in priority order**
   - Mark tasks `[x]` in `tasks.md` as they are completed.
4. **Stop at every phase checkpoint** to validate the deliverable independently before proceeding.
5. For each completed user story, run:
   ```
   pnpm test
   pnpm lint
   ```
6. After full implementation, run the complete suite:
   ```
   pnpm build
   pnpm test
   pnpm lint
   ```

### Guardrails

- NEVER skip a phase — each checkpoint is a quality gate.
- NEVER begin implementation without approved `tasks.md`.
- NEVER commit without passing tests and lint.
- If a task reveals a design flaw, update `plan.md` and get user approval before continuing.

---

## Phase 5: `sdd.checklist` — Validation Checklist

**Purpose**: Generate a targeted verification checklist once implementation is complete.

**Prerequisites**: Implementation is complete and tests pass.

### Steps

1. Read `spec.md` (for acceptance scenarios), `plan.md` (for constitution gates), and `tasks.md` (for implementation scope).
2. **Create a checklist** using `.ai/templates/checklist-template.md` as structure reference.
   - Include categories relevant to the feature: functional verification, security, observability, performance, etc.
   - Map checklist items back to FR-XXX and SC-XXX identifiers from `spec.md`.
3. Save to `specs/[NNN]-[feature-name]/checklist.md`.
4. Present the checklist to the user.

### Output

```
specs/[NNN]-[feature-name]/
├── spec.md      (existing)
├── plan.md      (existing)
├── tasks.md     (existing)
└── checklist.md (new)
```

---

## Full SDD Cycle — Overview

```
sdd.specify  →  [user review]  →  sdd.plan  →  [user review]  →  sdd.tasks  →  [user review]  →  sdd.implement  →  sdd.checklist
```

Each `[user review]` is a hard gate. The AI MUST stop and present the output for approval before advancing to the next phase.

---

## Key References

- Constitution: `docs/constitution.md`
- Templates: `.ai/templates/`
- Rules: `.ai/rules/`
- Existing specs: `specs/`
