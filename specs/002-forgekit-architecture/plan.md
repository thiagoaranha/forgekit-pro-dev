# Implementation Plan: ForgeKit Architecture Reference

**Branch**: `002-forgekit-architecture` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-forgekit-architecture/spec.md`

## Summary

Transform spec `002` into an enforceable architecture baseline for ForgeKit by defining concrete governance artifacts, architecture decision rules, review checklists, and integration points with existing gateway/service workflows.

This plan focuses on making architecture rules operational across service creation, implementation reviews, and evolution of synchronous and asynchronous communication patterns. It intentionally avoids infrastructure provisioning design and language/framework mandates, in line with the specification scope.

## Technical Context

**Language/Version**: Documentation-first planning; implementation context remains TypeScript 5.x on Node.js 22 LTS  
**Primary Dependencies**: Existing monorepo stack (Fastify, Zod, Prisma, shared observability/tooling packages), plus existing Speckit workflow and governance docs  
**Storage**: N/A for planning artifacts (documentation and review assets only)  
**Testing**: Reviewability and compliance validation through architecture checklists and planning gates; no new runtime test framework introduced in this feature plan  
**Target Platform**: Repository-wide governance for all backend services in the ForgeKit monorepo  
**Project Type**: Architecture governance and documentation feature  
**Performance Goals**: Architecture review decisions for new service designs and interaction flows can be made in under 15 minutes, aligned with spec success criteria  
**Constraints**: Preserve independent deployability, data ownership boundaries, gateway-first entry, identity propagation, correlation ID propagation, retry/DLQ rules, and at-least-once idempotency assumptions  
**Scale/Scope**: Applies to current gateway + example service baseline and all future scaffolded services

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Clean Code & Readability**: Pass. The plan emphasizes clear architectural contracts and reviewable artifacts instead of implicit conventions.
- **Testing Standards (80% Minimum Coverage)**: Pass. This feature is governance-oriented; it does not reduce or bypass existing test coverage policy and will define review hooks that preserve testing obligations in downstream implementation work.
- **Performance & Concurrency**: Pass. Architecture rules reinforce async-first behavior where required and failure-containment principles for synchronous interactions.
- **Security by Default**: Pass. Plan includes gateway authentication boundaries, identity propagation rules, and sensitive-data handling constraints as explicit architecture obligations.
- **Observability & Traceability**: Pass. Correlation ID propagation and structured logging requirements remain mandatory and reviewable.
- **Microservices Architecture Boundaries**: Pass. The feature is directly focused on enforcing service boundaries, data ownership, and approved communication patterns.
- **AI-Assisted Development Governance**: Pass. Outputs are review artifacts that support human-governed approvals and architecture compliance checks.

No constitution violations are required for this plan.

## Project Structure

### Documentation (this feature)

```text
specs/002-forgekit-architecture/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
`-- tasks.md
```

### Source Code (repository root)

```text
apps/
|-- gateway/
`-- services/
    `-- example-service/

packages/
|-- service-template/
|-- shared-observability/
|-- shared-testing/
`-- shared-tooling/

infra/
`-- compose/

scripts/
|-- bootstrap/
`-- scaffold/

.specify/
|-- memory/
`-- workflows/
```

**Structure Decision**: Keep implementation code structure unchanged in this planning feature and deliver architecture-governance artifacts under `specs/002-forgekit-architecture/`. Downstream execution work will map these artifacts to gateway/service/template/process updates where needed.

## Phase 0 Research

Research will confirm and document:

- The minimal artifact set required to make architecture rules enforceable in day-to-day development (review checklist, communication decision matrix, and compliance evidence model).
- How to align architecture checks with the existing Speckit workflow gates (`review-spec`, `review-plan`, `review-implementation`) without introducing process overhead that blocks normal delivery.
- How architecture rules from spec `002` map to existing runtime behavior in `apps/gateway` and `apps/services/example-service`, including current identity/correlation propagation and communication style.
- Which decisions must remain policy-only versus which need explicit implementation hooks in later specs (for example, schema governance, DLQ conventions, and event versioning controls).
- A lightweight architecture review workflow for new services scaffolded via `pnpm scaffold` so teams can classify sync vs async interactions consistently.

## Phase 1 Design

### Delivery Slice

The planning slice for spec `002` will define:

- A canonical architecture decision flow for choosing synchronous HTTP/gRPC, queue-based messaging, or publish/subscribe eventing.
- A review contract that requires explicit evidence for service boundary ownership, data access path, and failure-containment strategy.
- A communication contract baseline describing timeout expectations, retry/backoff expectations, idempotent consumer requirements, and DLQ expectations.
- An identity and observability propagation baseline requiring gateway authentication boundary, standardized claims propagation, and correlation ID continuity.
- A compliance checklist format that can be used before implementation starts and during architecture review.

### Architecture Enforcement Model

- **Boundary enforcement**: Proposed services must declare owned data, prohibited direct cross-service DB access, and approved integration contracts.
- **Interaction classification**: Every cross-service interaction must document whether immediate feedback is required and select communication pattern accordingly.
- **Failure handling**: Each interaction must define timeout/retry/degradation expectations and state how cascading failures are prevented.
- **Event discipline**: Event-based flows must define naming, versioning compatibility intent, idempotent consumption behavior, and retry/DLQ outcomes.
- **Security and traceability**: Externally reachable flows must route through gateway auth and propagate identity context plus correlation IDs end-to-end.

### Outputs for Task Generation

- A decision-ready `research.md` with unresolved trade-offs closed.
- A `data-model.md` capturing architecture review entities (service boundary declaration, interaction declaration, event contract declaration, compliance evidence).
- A `contracts/` package with architecture review and interaction classification templates.
- A `quickstart.md` explaining how engineers apply the architecture reference during service design and review.

## Implementation Strategy

1. Consolidate architecture rules from `spec.md` into reviewable decision points and classify each as mandatory or recommended.
2. Define governance artifacts that map each mandatory rule to concrete review evidence.
3. Design interaction classification and failure-handling templates for synchronous and asynchronous flows.
4. Define how architecture compliance integrates with existing Speckit review gates and repo workflows.
5. Prepare planning artifacts (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) to enable deterministic task breakdown in `tasks.md`.

## Planned Artifacts

- `specs/002-forgekit-architecture/research.md`: decisions on enforcement model, workflow integration, and scope boundaries.
- `specs/002-forgekit-architecture/data-model.md`: architecture governance entities and relationships.
- `specs/002-forgekit-architecture/quickstart.md`: how to apply architecture decision rules in day-to-day design.
- `specs/002-forgekit-architecture/contracts/architecture-review.md`: architecture review evidence contract.
- `specs/002-forgekit-architecture/contracts/interaction-classification.md`: sync/queue/pub-sub decision contract.
- `specs/002-forgekit-architecture/tasks.md`: phase-2 execution tasks generated from this plan.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
