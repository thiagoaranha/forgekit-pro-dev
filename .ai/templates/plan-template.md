# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: `specs/[###-feature-name]/spec.md`

## Summary

[Extract from feature spec: primary requirement + technical approach]

## Technical Context

<!--
  ACTION REQUIRED: Replace placeholders with actual technical details for this feature.
-->

**Language/Version**: [e.g., TypeScript 5.x, Node 22]
**Primary Dependencies**: [e.g., Fastify, Prisma, Zod]
**Storage**: [e.g., PostgreSQL via Prisma, or N/A]
**Testing**: [e.g., Vitest, Testcontainers]
**Target Platform**: [e.g., Linux container (Docker)]
**Project Type**: [e.g., microservice / shared-package / CLI]
**Performance Goals**: [e.g., <50ms p95 on health endpoint, or N/A]
**Constraints**: [e.g., must stay within existing shared-observability interface]
**Scale/Scope**: [e.g., single service, internal traffic only]

## Constitution Check

*GATE: Must pass before implementation begins. Re-check after design phase.*

Validate against `docs/constitution.md`:

- [ ] Clean Code & Readability — no over-engineering, consistent structure
- [ ] Testing Standards — 80% minimum coverage planned
- [ ] Performance & Concurrency — async patterns where applicable
- [ ] Security by Default — auth/validation enforced on all endpoints
- [ ] Observability & Traceability — structured logging + correlation ID
- [ ] Microservices Boundaries — data ownership, no cross-DB access
- [ ] AI-Assisted Development Governance — human review mandatory

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Optional: Phase 0 research output
├── data-model.md        # Optional: entity/schema design
├── quickstart.md        # Optional: how to run/test this feature
├── contracts/           # Optional: API contracts / OpenAPI fragments
└── tasks.md             # Phase 2 output — generated separately
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Adjust to match real paths (e.g., apps/my-service, packages/something).
-->

```text
apps/services/[service-name]/
├── src/
│   ├── routes/
│   ├── services/
│   └── index.ts
└── tests/
    ├── unit/
    └── integration/
```

**Structure Decision**: [Document the selected structure and rationale]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
