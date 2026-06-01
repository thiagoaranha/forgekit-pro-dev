# Standard Error and Operational Contract

## Purpose

Standardize outward-facing error semantics and baseline operational signals for ForgeKit services.

## Error Response Contract

Every external error response MUST include:

- `code`: stable machine-readable error code.
- `message`: human-readable message safe for consumers.
- `traceId`: request-scoped identifier (`correlationId`, `traceId`, or equivalent standardized value).

## Error Handling Rules

- Internal exceptions MUST be translated to sanitized external failures.
- Responses MUST NOT expose stack traces, credentials, tokens, infrastructure internals, or sensitive personal data.
- Business, validation, dependency, and unexpected internal failures MUST be distinguishable by stable semantics.

## Operational Signals Contract

- **Liveness**: Indicates only process health and MUST NOT depend on external systems.
- **Readiness**: Indicates capability to safely handle traffic/messages and MAY depend on required dependencies.
- Services MUST document which dependencies affect readiness.

### Readiness Dependency Declaration

Every service readiness contract MUST include:

- `dependency`: dependency name used in runtime checks.
- `requiredForReadiness`: boolean flag indicating whether traffic/message handling is blocked.
- `failureEffect`: short statement describing degraded behavior when dependency is unavailable.

Example declaration:

| dependency | requiredForReadiness | failureEffect |
|---|---|---|
| `primary-database` | `true` | Reject write and read traffic with `503` readiness state. |
| `message-broker` | `false` | Continue API traffic, suspend event publication and report degraded mode. |

## Metrics Contract

- Services MUST expose machine-readable metrics for request count, error rate, and latency.
- Metric labels MUST avoid sensitive data and high-cardinality uncontrolled values.
- Metric emission failures MUST NOT crash request handling paths.

## Logging and Correlation Rules

- Logs MUST be structured and machine-parseable.
- Each log entry MUST include timestamp, service name, level, message, and correlation ID.
- Error logs MUST include enough context for diagnosis without exposing sensitive data.
