# Skill: ForgeKit Spec Audit (Cognitive Validation)

## Purpose
This skill provides a structured methodology for AI agents to validate their implementations against the project's specifications (`spec.md`). It ensures that no requirement is overlooked and that the technical output aligns with the architecture's "constitution".

## Audit Workflow

### 1. Context Loading
- Locate and read the target `spec.md` and `plan.md`.
- Extract all Functional Requirements (FR-XXX) and Acceptance Scenarios (SC-XXX).
- Identify all target files and directories mentioned in the specification.

### 2. Evidence Collection
For each requirement, perform a code inspection to find "Evidence of Implementation":
- **Structural Evidence**: Does the file exist in the correct location?
- **Behavioral Evidence**: Does the logic (functions, routes, classes) reflect the requirement?
- **Integration Evidence**: Is the code correctly wired into the ecosystem (e.g., Gateway, Docker Compose)?

### 3. Gap Analysis
- Identify any FRs that are not explicitly covered in the code.
- Identify any "leaked" implementation details that contradict the spec's technology-agnostic goals.

### 4. Validation Report Generation
Produce a final report in the following format:

```markdown
# Validation Report: [Feature Name]
**Status**: [PASS | FAIL | PARTIAL]
**Spec**: [Link to spec.md]

## Functional Requirements Coverage
- [x] **FR-001**: Description | *Evidence: [Link to file:L1-L10]*
- [ ] **FR-002**: Description | *Missing: Reason*

## Acceptance Scenarios Validation
- [x] **SC-001**: Scenario Name | *Status: Verified*

## Audit Notes
- Highlights of implementation quality.
- Identified risks or technical debt.
```

## Mandatory Quality Checks
- **Clean Code**: No magic numbers, descriptive naming.
- **Convention**: Does it follow the established monorepo patterns?
- **Observability**: Are logs and correlation IDs correctly handled?
- **Security**: Are auth/JWT checks implemented where required?

## Usage Instructions
Invoke this skill by saying: *"Execute Spec Audit for [Path to Spec Directory]"*.
The agent must then perform the steps above and output the Validation Report.
