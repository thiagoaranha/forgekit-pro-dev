# Skill: ForgeKit Pull Request Generator

## Purpose
This skill automates the creation of high-quality, standardized Pull Request (PR) descriptions that align with ForgeKit's engineering standards. It ensures that every PR communicates its value, implementation details, and testing procedures clearly to reviewers.

## Trigger
Invoke this skill when the developer says:
- *"Generate a PR message for these changes"*
- *"Draft a Pull Request description"*
- *"Create a standardized PR message"*

## Workflow

### 1. Change Analysis
- Perform a `git diff --staged` or `git diff main...HEAD` to understand the code changes.
- Identify the type of change (Feature, Fix, Refactor, Docs, etc.) based on Conventional Commits in the history or the current diff.
- Locate any relevant `spec.md` or `plan.md` files that were modified or fulfilled.

### 2. Information Extraction
- **Commits**: Extract the commit messages for the current branch.
- **Features**: Identify new modules, services, routes, or significant logic blocks.
- **Fixes**: Identify what bug was addressed.
- **Testing**: Look for new test files (`*.test.ts`, `*.spec.ts`) or changes to `scripts/doctor` to infer how to test the changes.

### 3. PR Message Generation
Generate the PR message using the following standardized template:

```markdown
## Summary
[Provide a high-level, 1-3 sentence explanation of the PR's purpose and the problem it solves.]

## Key Features/Changes
- **[Feature Category]**:
    - [Bullet point describing specific implementation detail].
    - [Bullet point describing the impact or rationale].
- **[Feature Category]**:
    - [Detail].

## Commits in this PR
1. **`[Commit Message]`**: [Briefly explain what was done in this commit if the message isn't descriptive enough].
2. **`[Commit Message]`**: [Briefly explain].

## How to Test
1. [Step 1: e.g., Run `pnpm boot`]
2. [Step 2: e.g., Execute specific command or hit endpoint]
3. [Step 3: e.g., Verify specific log output or DB state]

## Checklist
- [ ] Follows Conventional Commits.
- [ ] Documentation is updated (README, AGENTS, Specs).
- [ ] Architecture principles respected (Constitution).
- [ ] Tests passed and coverage targets maintained.
```

## Guidelines for Content
- **Be Technical but Concise**: Target experienced engineers. Avoid fluff.
- **Actionable Testing**: Ensure "How to Test" steps are reproducible and specific to the monorepo commands (`pnpm boot`, `pnpm --filter ...`, etc.).
- **Flexible Scope**: If the PR only touches documentation, adjust the "Key Features" to focus on clarity and "How to Test" to "Verify rendered markdown".
- **Link Evidence**: If specific Functional Requirements (FR-XXX) from a spec were implemented, mention them in the features list.

## Usage Instructions
Upon invocation, the agent will:
1. Scan the current branch and git status.
2. Draft the message based on the findings.
3. Present the drafted message to the user for final approval or manual adjustment.
