# Spec 006: Automated Spec Validation (SpecAudit)

## 1. Overview
As the ForgeKit ecosystem grows, maintaining consistency between implementation and specifications becomes critical. Currently, validation is a manual process prone to human (and AI) error. 

**SpecAudit** is a framework and toolset designed to provide automated and semi-automated validation of features against their source specifications. It ensures that every functional requirement (FR) defined in a `spec.md` is accounted for in the codebase and passes its defined acceptance scenarios.

## 2. User Stories

### User Story 1 - AI Self-Audit
As an AI coding assistant, I want a standardized "Skill" that I can execute after finishing a task, so that I can self-verify my work against the spec before presenting it to the user, reducing the feedback loop and ensuring high-quality delivery.

### User Story 2 - Automated Infrastructure Validation
As a developer or CI/CD pipeline, I want to run a command that verifies the "technical contract" of a spec (e.g., file existence, configuration keys, routing entries), so that I can catch integration regressions early.

## 3. Functional Requirements

### FR-001: Spec Mapping Logic
The tool must be able to parse a ForgeKit-compliant `spec.md` and extract:
- Functional Requirements (FR IDs and descriptions).
- Acceptance Scenarios.
- Target files/directories mentioned in the spec.

### FR-002: Evidence Tracking
The validation process must produce "Evidence" for each FR. Evidence can be:
- **File Existence**: Verifying a required file was created.
- **Content Match**: Verifying a specific pattern (regex) exists in a file.
- **Execution Status**: Verifying a command (like a health check) returns success.

### FR-003: Validation Report
The tool must generate a summary report (e.g., `validation_report.md` or console output) showing:
- [x] Passed requirements.
- [ ] Failed/Missing requirements.
- Coverage percentage.

### FR-004: AI Skill Integration
Provide a Markdown-based "Skill" (`skills/spec-audit.skill.md`) containing meta-instructions for AI models to perform cognitive audits (logic flow, design patterns, constitution compliance).

## 4. Acceptance Scenarios

### SC-001: Validate Spec 005 (Scaffold Integration)
**Given** the current implementation of Spec 005, **When** running the validation tool against `specs/005-scaffold-integration/spec.md`, **Then** the report must show 100% compliance for all Docker, Gateway, and Port allocation requirements.

### SC-002: Catch Missing Requirement
**Given** a service scaffolded with a missing `Dockerfile`, **When** the validation tool runs, **Then** it must explicitly flag the missing file and fail the audit.

## 5. Non-Goals
- Automated unit testing (handled by Jest/Vitest).
- Performance benchmarking.
- Deep static analysis (handled by ESLint/TypeScript).
