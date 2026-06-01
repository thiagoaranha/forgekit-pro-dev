# Phase 0 Research: ForgeKit Architecture Enforcement Model

## 1. Architecture Enforcement Artifact Set
- **Decision:** Use four mandatory artifacts for architecture review: `spec.md`, `contracts/architecture-review.md`, `contracts/interaction-classification.md`, and `quickstart.md`.
- **Why:** This keeps policy, decision criteria, review evidence, and execution guidance separated but traceable.

## 2. Identity Context Propagation Standard
- **Decision:** Standardize propagated identity context with `x-user-id`, `x-user-roles`, and `x-user-permissions` for synchronous calls, with equivalent metadata fields for asynchronous events.
- **Why:** Reviewers can validate authorization context consistency without inferring service-specific header names.
- **Constraint:** Token passthrough can exist as supplementary transport but does not replace standardized claims.

## 3. Synchronous Communication Baseline
- **Decision:** HTTP is the default synchronous protocol. gRPC is allowed only for internal interactions where low latency and strongly typed contracts are explicit requirements.
- **Decision:** Timeout policy follows interaction classes (`internal-read`, `internal-write`, `external-dependency`) with architecture defaults and a hard maximum timeout.
- **Why:** Teams get consistent defaults while preserving explicit exceptions for justified cases.

## 4. Asynchronous Reliability Baseline
- **Decision:** Consumers classify failures as retryable or non-retryable before retries.
- **Decision:** Retryable failures use exponential backoff with jitter and a maximum of 3 attempts; exhausted messages move to DLQ.
- **Decision:** Non-retryable failures bypass retries and move directly to DLQ (or equivalent failure channel).
- **Why:** This removes ambiguity in failure handling and improves operational predictability under at-least-once delivery.

## 5. Event Schema Governance Authority
- **Decision:** Adopt a hybrid governance model.
  - Producing services own their event schemas and versioning.
  - Central architecture governance defines compatibility rules, review triggers, and escalation process.
  - Backward-incompatible changes require explicit architecture review plus documented migration strategy.
- **Why:** Preserves team autonomy while protecting cross-service compatibility.

## 6. Workflow Integration
- **Decision:** Map architecture checks to existing Speckit gates.
  - `review-spec`: confirm all requirements are explicit and unambiguous.
  - `review-plan`: confirm required artifacts and enforcement model are planned.
  - `review-implementation`: confirm review contracts are complete and usable before downstream implementation.
- **Why:** Reuses existing project workflow with no additional gate type.
