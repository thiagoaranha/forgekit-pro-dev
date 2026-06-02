# Skill: ForgeKit Constitution Compliance Check

## Purpose
This skill performs a targeted compliance validation of a code change against the ForgeKit Constitution and the applicable `.ai/rules/*.md` files. Unlike the `spec-audit` skill (which validates against a spec document), this skill validates against **engineering governance principles** — coding standards, testing requirements, security constraints, and architecture boundaries.

## Trigger
Invoke this skill when:
1. You are about to open a PR and want to confirm the implementation is constitution-compliant.
2. A reviewer asks: *"Check this against the constitution"*.
3. You have made architectural or structural changes and want governance validation.
4. You are acting as the QA Tester and need a pre-flight compliance check.

## Context to Load
Before starting, load the following files:
- `.specify/memory/constitution.md` — the canonical governance document
- `.ai/rules/code-style.md` — if the diff touches any source code
- `.ai/rules/testing.md` — always
- `.ai/rules/api-conventions.md` — if the diff touches HTTP handlers, middleware, or routes
- `.ai/rules/service-architecture.md` — if the diff touches service boundaries, shared packages, or Docker config

## Compliance Check Workflow

### 1. Diff Analysis
- Review the staged or provided changes.
- Identify which governance domains are relevant (code style, testing, API, architecture).
- Select only the applicable rule files — do not load all of them for a simple docs change.

### 2. Per-Principle Validation

For each applicable rule, check each principle:

**§I — Clean Code & Readability** (`.ai/rules/code-style.md`)
- [ ] Descriptive names used throughout
- [ ] No `any` types
- [ ] Functions are small and single-purpose
- [ ] No magic numbers/strings
- [ ] No unnecessary comments (code is self-documenting)

**§II — Testing Standards** (`.ai/rules/testing.md`)
- [ ] New logic has unit tests
- [ ] New routes have integration tests
- [ ] 80% coverage threshold maintained or exceeded
- [ ] No flaky test patterns

**§IV — Security by Default** (`.ai/rules/api-conventions.md`)
- [ ] Auth enforced on all appropriate endpoints
- [ ] Input validated with Zod before processing
- [ ] No secrets or PII in logs/errors
- [ ] No hardcoded credentials

**§V — Observability** (`.ai/rules/api-conventions.md`)
- [ ] Pino logger used (no `console.log`)
- [ ] Correlation ID propagated
- [ ] Errors logged with sufficient context

**§VI — Architecture Boundaries** (`.ai/rules/service-architecture.md`)
- [ ] No cross-service database access
- [ ] New services fully registered (gateway + docker-compose)
- [ ] Communication through defined contracts only

### 3. Compliance Report Output

```markdown
# Constitution Compliance Report

**Change**: [Description of what was reviewed]
**Date**: [ISO date]
**Compliance Status**: ✅ COMPLIANT | ⚠️ COMPLIANT WITH WARNINGS | ❌ NON-COMPLIANT

---

## Checklist Results

| Principle | Status | Notes |
|-----------|--------|-------|
| §I Clean Code | ✅ | — |
| §II Testing (≥80%) | ⚠️ | Coverage at 74% — must increase |
| §IV Security | ✅ | — |
| §V Observability | ❌ | Correlation ID missing in 2 handlers |
| §VI Architecture | ✅ | — |

## Violations

### ❌ Violation: [Principle §X — Short Title]
- **Location**: `apps/services/billing/src/handler.ts:L45`
- **Issue**: [Specific description of violation]
- **Required Fix**: [Concrete action to resolve]

## Verdict
[Summary: Is this ready to merge? What must be addressed?]
```

## Usage Instructions
Invoke this skill by saying:
- *"Execute Constitution Check for [files or feature]"*
- *"Run compliance check before PR"*
