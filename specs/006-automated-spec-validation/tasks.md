# Implementation Tasks: Automated Spec Validation

## Phase 1: AI Audit Skill
- [x] **Task 1.1**: Create `skills/spec-audit.skill.md` with detailed instructions for AI agents to audit code against `spec.md`.
- [x] **Task 1.2**: Define the "Validation Report" template (Markdown) that the agent must produce.

## Phase 2: Core Validation CLI
- [x] **Task 2.1**: Initialize `scripts/validate-spec.js`.
- [x] **Task 2.2**: Implement `spec.md` parser to extract Functional Requirements (FR) and Acceptance Scenarios (SC).
- [x] **Task 2.3**: Implement basic file-existence checks based on spec content.
- [x] **Task 2.4**: Implement regex-based content checks (e.g., verifying if a port is mapped).

## Phase 3: Reporting & Integration
- [x] **Task 3.1**: Add `pnpm validate-spec` to root `package.json`.
- [x] **Task 3.2**: Implement a formatted console output for validation results.
- [x] **Task 3.3**: Run the tool against Spec 005 as a benchmark.
