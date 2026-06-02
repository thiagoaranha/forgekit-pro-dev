# Skill: ForgeKit Documentation Synchronization

## Purpose
This skill ensures that whenever structural, architectural, or significant logic changes are made in the codebase, the core project documentation remains accurate and up-to-date. It prevents configuration drift between the codebase and its "source of truth" documentation.

## Trigger
This skill should be invoked whenever:
1. Significant new features, modules, or microservices are introduced or removed.
2. Architecture boundaries, patterns, or global project structures are modified.
3. New commands or scripts are added to `package.json` or `scripts/`.
4. Dependencies, ports, or environment requirements are updated.
5. The developer asks to prepare a commit or specifically requests to check documentation (`"Check documentation for this commit"`).

## Target Documents
The agent MUST verify and propose updates to the following documents if impacted by the implementation:

1. **`README.md` (Root)**: 
   - Verify if changes impact "Getting Started", "Common Commands", "Prerequisites", or the high-level description.
2. **`AGENTS.md`**: 
   - Verify if changes impact "Runtime + Workspace Facts", "High-Value Commands", "Architecture Reality", or "Gotchas Likely To Waste Time". (e.g. adding a new service port or exposing a new shared library).
3. **`.specify/memory/constitution.md`**: 
   - Check if new standards, testing rules, or security requirements have been implicitly created or need to be formalized. *(Note: Requires explicit user consent to modify)*.
4. **`specs/*.md`**: 
   - Verify if the implementation deviates from or fulfills any documented specification, requiring an update to the spec's state, details, or acceptance scenarios.

## Audit & Sync Workflow

### 1. Analyze the Diff (Implementation Review)
- Review the recent changes, staged files, or the proposed commit.
- Identify what has changed contextually: Have new services, scripts, or architectural patterns been added? Have existing ones been removed, renamed, or altered in behavior?

### 2. Document Verification
- Read `README.md`, `AGENTS.md`, and other relevant specification documents.
- Compare the current state of these documents against the implemented changes.
- Look for outdated facts (e.g., "port 3001 is used by X", but now X is on port 3002, or a new CLI command was added that should be documented).

### 3. Propose/Apply Updates
- Formulate the exact edits needed for each outdated document.
- Use `replace_file_content` or `multi_replace_file_content` to apply the updates.
- Ensure the language remains concise, professional, and factual.
- **IMPORTANT**: If modifying the `constitution.md`, the AI must highlight this specifically to the user as it represents a core governance change.

### 4. Validation Report Generation
Output a brief summary to the user indicating which documents were checked, which were updated, and why.

## Usage Instructions
Invoke this skill by saying: *"Execute Doc Sync Skill"* or *"Check major documentation for this commit"*.
