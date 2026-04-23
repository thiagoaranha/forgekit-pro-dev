# Service Compliance Review Contract

## Purpose

Define objective evidence required to approve a ForgeKit service as compliant with spec `003`.

## Required Evidence

- **Layering and boundaries**: The service shows explicit transport, application, domain, and infrastructure boundaries with inward dependency direction.
- **Configuration and secrets**: Required settings are externalized, validated at startup, and secrets are not hardcoded or logged.
- **Security at boundaries**: Input is validated at entry points, identity context is consumed from gateway propagation, and authorization is enforced per operation.
- **Observability**: Logs are structured and include timestamp, service name, level, message, and correlation ID.
- **Error contract**: External failures are sanitized and follow a stable structure with code, message, and request-scoped trace identifier.
- **Runtime operations**: Liveness and readiness signals are exposed with clear separation of intent; graceful shutdown is implemented.
- **Tests and quality**: Unit and integration tests exist, critical business rules are directly tested, and minimum 80% line coverage is enforced.
- **API/event contracts**: External contracts are documented, boundary validation is enforced, versioning rules are respected, and event consumption is idempotent.

## Review Decision Rules

- **Approve**: All mandatory evidence is present and no constitutional or spec `003` MUST requirement is violated.
- **Conditionally approve**: Only documentation-level gaps remain and no MUST requirement is blocked for safe operation.
- **Reject**: Any MUST requirement is missing, unverified, or contradicted by implementation behavior.

## Output Record

- Service name and version under review.
- Reviewer name and review date.
- Compliance result (approve, conditional, reject).
- List of failed requirements with remediation owner.
