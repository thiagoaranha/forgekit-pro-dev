# Service Compliance Review Contract

## Purpose

Define objective evidence required to approve a ForgeKit service as compliant with spec `003`.

## Evidence Matrix

| Requirement Category | Mandatory Evidence Source | Reviewer Checks |
|---|---|---|
| Layering and boundaries | Service source tree and module imports | Transport, application, domain, and infrastructure layers are explicit; dependency direction is inward-only; transport models are mapped before domain use. |
| Configuration and secrets | Config schema, startup path, runtime docs | Required config is externalized and validated at startup; invalid/missing config fails fast; secrets are not hardcoded or logged. |
| Validation boundaries and authorization | HTTP/RPC/message handlers and authorization points | All external inputs are schema validated at boundaries; gateway-propagated identity is consumed; protected operations enforce local authorization rules. |
| Observability and correlation | Log fields, middleware/hooks, metrics endpoint | Logs are structured; each entry includes timestamp, service, level, message, and correlation ID; request/error/latency metrics are emitted. |
| Error contract and sanitization | Error handler and contract docs | Outward failures follow stable structure (`code`, `message`, trace identifier); internal errors are sanitized; sensitive data is excluded from output and logs. |
| Runtime operations | Health endpoints and shutdown hooks | Liveness is process-only; readiness represents ability to serve and declares dependency impact; graceful shutdown rejects new work and closes resources safely. |
| Tests and quality | Unit/integration tests and coverage reports | Unit and integration suites exist; critical business rules are directly tested; deterministic tests; minimum 80% line coverage enforced. |
| API and event contracts | API/event docs and handler validations | External contracts are documented and version-aware; response semantics are consistent; event consumers are idempotent and validate payload metadata. |

## Security and Data-Handling Criteria

- Inputs from body, query, headers, and message payloads MUST be validated before orchestration or domain execution.
- Logs, responses, events, and metrics labels MUST NOT include secrets, credentials, tokens, or unnecessary identity claims.
- Validation failures, business failures, dependency failures, and unexpected internal failures MUST be distinguishable by stable error semantics.
- Correlation metadata MUST propagate across synchronous and asynchronous execution paths that produce logs or telemetry.

## Review Decision Rules

- **Approve**: All mandatory evidence is present and no constitutional or spec `003` MUST requirement is violated.
- **Conditionally approve**: Only documentation-level gaps remain and no MUST requirement is blocked for safe operation.
- **Reject**: Any MUST requirement is missing, unverified, or contradicted by implementation behavior.

## Output Record

- Service name and version under review.
- Reviewer name and review date.
- Compliance result (approve, conditional, reject).
- List of failed requirements with remediation owner.
- Evidence links for each requirement category.
