# AI Agent Structure — Developer Guide

This document explains the `.ai/` folder: what it is, why it exists, and how to use it day-to-day. It is written for **developers**, not for AI agents.

---

## What is the `.ai/` folder?

The `.ai/` folder is a portable, LLM-agnostic governance layer for AI-assisted development in this monorepo. It organizes AI behavior through plain Markdown files and Node.js scripts — no IDE lock-in, no proprietary plugin required.

The core idea: **instead of relying on an AI tool's built-in memory or settings, we write down the rules and workflows as structured documents that any AI assistant can read.**

This means the same governance files work whether you are using Cursor, Claude Code, GitHub Copilot, Gemini, ChatGPT, or any other tool.

### Design Principles

| Principle | Explanation |
|-----------|-------------|
| **LLM-agnostic** | All files are plain Markdown. No tool-specific syntax. |
| **Portable** | Works in any IDE or AI assistant that can read files. |
| **Modular** | Load only what you need — reduces context window noise. |
| **Human-readable** | Every file is written for humans first, AI second. |
| **Single source of truth** | Rules live here, not scattered across chat histories. |

---

## Directory Reference

```
.ai/
├── rules/       → Engineering governance rules (what the AI must follow)
├── agents/      → Specialized sub-agent instruction sets (who the AI should become)
├── skills/      → Repeatable workflow procedures (what the AI should do step-by-step)
└── hooks/       → Runnable Node.js scripts for validation and automation
```

### `rules/` — Engineering Governance

Focused rule files extracted from the [Constitution](.specify/memory/constitution.md). Load only the relevant file(s) for your task to minimize context.

| File | Contents |
|------|----------|
| [`rules/code-style.md`](.ai/rules/code-style.md) | Naming conventions, SRP, DRY, TypeScript typing, comment policy |
| [`rules/testing.md`](.ai/rules/testing.md) | 80% coverage mandate, test types, quality requirements, CI gates |
| [`rules/api-conventions.md`](.ai/rules/api-conventions.md) | Auth/JWT, correlation IDs, Zod validation, Pino logging, HTTP response standards |
| [`rules/service-architecture.md`](.ai/rules/service-architecture.md) | Service boundaries, data ownership, communication patterns, scaffold gotchas |

### `agents/` — Sub-Agent Personas

Each file transforms the AI into a specialized expert with a defined role, scope, and output format. Invoke them by copying the file content into your AI tool's system prompt, or by referencing the file path.

| File | Role | When to use |
|------|------|------------|
| [`agents/code-reviewer.md`](.ai/agents/code-reviewer.md) | Senior code reviewer | Before opening a PR — get a structured review report |
| [`agents/security-auditor.md`](.ai/agents/security-auditor.md) | Security specialist | When adding auth, routes, or new dependencies |
| [`agents/scaffold-assistant.md`](.ai/agents/scaffold-assistant.md) | Scaffold guide | When adding a new microservice |
| [`agents/qa-tester.md`](.ai/agents/qa-tester.md) | QA tester | After implementation — validate everything works end-to-end |

### `skills/` — Repeatable Workflows

Skills are step-by-step procedures the AI follows when invoked. Unlike agents (which define *who* the AI is), skills define *what* the AI does.

| File | Purpose | Invocation phrase |
|------|---------|------------------|
| [`skills/doc-sync.skill.md`](.ai/skills/doc-sync.skill.md) | Keep docs in sync with code | *"Execute Doc Sync Skill"* |
| [`skills/pr-generator.skill.md`](.ai/skills/pr-generator.skill.md) | Generate standardized PR descriptions | *"Generate a PR message for these changes"* |
| [`skills/spec-audit.skill.md`](.ai/skills/spec-audit.skill.md) | Validate implementation against spec | *"Execute Spec Audit for specs/00X-..."* |
| [`skills/constitution-check.skill.md`](.ai/skills/constitution-check.skill.md) | Check code against the constitution | *"Execute Constitution Check"* |

### `hooks/` — Automation Scripts

Runnable Node.js scripts for validation and pre-flight checks. Not Git hooks by default — run them manually or instruct the AI to run them at the appropriate moment.

| Script | Purpose | Usage |
|--------|---------|-------|
| [`hooks/validate-commit-message.js`](.ai/hooks/validate-commit-message.js) | Validates Conventional Commits format | `node .ai/hooks/validate-commit-message.js "<message>"` |
| [`hooks/pre-scaffold.js`](.ai/hooks/pre-scaffold.js) | Pre-flight check before adding a new service | `node .ai/hooks/pre-scaffold.js <service-name> <port>` |

---

## How to Use Agents

### In any AI chat tool (ChatGPT, Gemini, Claude, etc.)

1. Open the agent file (e.g., [`.ai/agents/code-reviewer.md`](.ai/agents/code-reviewer.md)).
2. Copy its full contents.
3. Paste it as the system prompt or first message to the AI.
4. Follow up with: *"Here is the diff to review: [paste diff]"*.

### In an IDE with AI integration (Cursor, Claude Code, etc.)

Reference the file directly using the `@` mention or file attachment feature of your tool:
```
@.ai/agents/code-reviewer.md
Review the current diff for me.
```

### Example invocations

```
# Code review
"Act as code reviewer for the changes on branch feat/billing-service"

# Security audit
"Act as security auditor for apps/services/billing-service/src"

# Scaffold a new service
"Act as scaffold assistant, I want to add payment-service on port 3003"

# QA testing
"Act as QA tester for specs/011-billing-service"
```

---

## How to Use Skills

Trigger a skill by saying its invocation phrase to the AI:

```
"Execute Doc Sync Skill"
"Generate a PR message for these changes"
"Execute Spec Audit for specs/005-scaffold-integration"
"Execute Constitution Check before I open this PR"
```

The AI will follow the step-by-step workflow defined in the skill file and produce the expected output (report, PR message, etc.).

---

## How to Use Hooks

Hooks are standalone scripts. Run them from the monorepo root:

```bash
# Validate a commit message before committing
node .ai/hooks/validate-commit-message.js "feat(billing): add invoice creation endpoint"
# ✅ Commit message is valid.

node .ai/hooks/validate-commit-message.js "wip stuff"
# ❌ Commit message validation FAILED

# Pre-flight check before scaffolding a service
node .ai/hooks/pre-scaffold.js billing-service 3002
# Runs all checks and prints the post-scaffold reminder checklist
```

### Optional: Set up as Git commit-msg hook

If you want automatic commit message validation on every commit:

```bash
# Windows (PowerShell)
Copy-Item .ai/hooks/validate-commit-message.js .git/hooks/commit-msg
```

Then add to `.git/hooks/commit-msg` (or as a standalone hook runner):
```bash
#!/bin/sh
node .ai/hooks/validate-commit-message.js "$1"
```

---

## How to Add New Files

### Adding a new Rule

1. Create `.ai/rules/<topic>.md` following the structure of existing rule files.
2. Add a header with `> Scope:` and `> Source:` metadata.
3. Organize by principle, not by file — rules should be timeless, not tied to specific implementations.
4. Update the table in this document and in `AGENTS.md`.

### Adding a new Agent

1. Create `.ai/agents/<role>.md`.
2. Define: **Role**, **Context to Load**, **Workflow**, **Output Format**, **Invocation**.
3. The agent must reference specific `rules/*.md` files — never duplicate rule content inline.
4. Update the table in `AGENTS.md`.

### Adding a new Skill

1. Create `.ai/skills/<name>.skill.md` (keep the `.skill.md` suffix convention).
2. Define: **Purpose**, **Trigger**, **Workflow** (numbered steps), **Usage Instructions**.
3. Invocation phrases must be unique and unambiguous.
4. Update the table in `AGENTS.md`.

---

## Relationship to `constitution.md`

The [Constitution](.specify/memory/constitution.md) is the **authoritative governance document** — it defines the principles that all code must follow. It is the source of truth.

The `.ai/rules/` files are **focused extracts** of the constitution, scoped to specific topics. They exist to reduce the cognitive load for AI agents: instead of loading the entire constitution for every task, the agent loads only the relevant rule file.

> **Rule**: If a `rules/*.md` file ever contradicts `constitution.md`, the constitution wins. File a correction to the rule file.

To amend the constitution itself, follow the amendment procedure documented at the bottom of `constitution.md`.
