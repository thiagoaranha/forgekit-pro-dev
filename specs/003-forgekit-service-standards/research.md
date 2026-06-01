# Research: ForgeKit Service Template and Implementation Standards

## Scope Decisions

- FR-049 (distributed tracing) is a `SHOULD` and is intentionally deferred from mandatory Phase 1 enforcement; this phase keeps tracing as recommended guidance while enforcing all observability `MUST` requirements (structured logs, correlation propagation, metrics baseline).

## Requirement Coverage Strategy

- **Structure and layering (FR-001..FR-013, FR-060, FR-061, FR-064)**: enforced by `packages/service-template/src/` layout and review criteria in `contracts/service-compliance-review.md`.
- **Configuration and secrets (FR-014..FR-018)**: enforced by template config contract patterns and review checks in `contracts/service-compliance-review.md`.
- **Logging, correlation, and observability (FR-019..FR-022, FR-047..FR-048, FR-063, FR-068..FR-069)**: defined in `contracts/standard-error-and-ops.md`, template runtime paths, and quickstart validation steps.
- **Error handling and sanitization (FR-023..FR-026, FR-062, FR-066)**: standardized in `contracts/standard-error-and-ops.md` and verified through review contract evidence.
- **Testing baseline (FR-027..FR-032, FR-065)**: represented by template test stubs, coverage guidance, and compliance review checks.
- **API and event contracts (FR-033..FR-042, FR-067)**: documented in `quickstart.md` and reviewed through `contracts/service-compliance-review.md`.
- **Security and identity propagation (FR-043..FR-046)**: reviewed by boundary validation and data-handling criteria in `contracts/service-compliance-review.md`.
- **Runtime entrypoint and workflows (FR-050..FR-056)**: represented in template startup flow and validation workflow in `quickstart.md`.
- **Scope and neutrality constraints (FR-057..FR-059)**: preserved in spec artifacts by policy-only language and no framework lock-in.
