# Architecture Review Contract

## Purpose
Provide a mandatory evidence checklist for architecture approval before implementation starts.

## 1) Service Boundary and Data Ownership

Required evidence:
- Service responsibility statement is explicit and non-overlapping.
- Service declares its owned datastore(s).
- Proposal confirms no direct database access to another service.
- Cross-service data access is only via API contracts or event contracts.

Required decision:
- `pass` only if all boundary and ownership constraints are satisfied.

## 2) Synchronous and Asynchronous Interaction Evidence

Required evidence per interaction:
- Interaction pattern selected: `sync-http`, `sync-grpc`, `async-queue`, or `async-pubsub`.
- Immediate-feedback requirement is explicit.
- If synchronous, timeout class and values are specified.
- If asynchronous, producer/consumer responsibilities are explicit.
- Failure-containment behavior is documented.

Required decision:
- `pass` only if interaction type is justified and matches architecture rules.

## 3) Identity Context Propagation

Required evidence:
- For synchronous paths, identity context includes:
  - `x-user-id`
  - `x-user-roles`
  - `x-user-permissions`
- For asynchronous paths, equivalent metadata fields are defined with same semantics.
- Downstream services rely on propagated claims and do not re-authenticate the same request context.

Required decision:
- `pass` only if identity context is standardized and complete across all reviewed flows.

## 4) Observability and Traceability

Required evidence:
- Correlation ID propagation is defined for all synchronous and asynchronous hops.
- Structured logging includes service name, timestamp, level, message, and correlation ID.
- Logging/tracing strategy avoids sensitive data in logs and metadata.

Required decision:
- `pass` only if traceability is end-to-end and sensitive data exposure risk is addressed.

## 5) Event Contract Governance

Required evidence:
- Producer service is explicitly identified as schema owner.
- Event name follows domain outcome conventions.
- Versioned schema compatibility intent is documented.
- Breaking-change indicator is explicit.
- Breaking changes include architecture review reference and migration strategy.

Required decision:
- `pass` only if schema governance rules and compatibility controls are satisfied.

## 6) Approval Output

Use one of the following outcomes:
- `approved`
- `approved-with-conditions`
- `rejected`

Approval record must include:
- Review ID
- Reviewer
- Date
- Decision
- Mandatory follow-ups (if any)
