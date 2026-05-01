# Feature Specification: ForgeKit Observability Standards

**Feature Branch**: `008-forgekit-observability`
**Created**: 2026-04-29
**Status**: Draft
**Input**: User description: "Create the observability specification for the project."

## Observability Overview

Observability is a first-class concern in ForgeKit. Every service MUST be designed, implemented, reviewed, and operated as an observable component of a distributed system.

ForgeKit observability consists of logs, metrics, traces, health signals, and error diagnostics working together. No single signal is sufficient on its own. Logs MUST explain what happened, metrics MUST quantify system behavior, and traces MUST connect work across service boundaries. Together, these signals MUST allow operators and developers to understand request flow, diagnose failures, measure performance, and identify degraded behavior in production-like environments.

Observability requirements apply to all ForgeKit services, including API-facing services, internal services, background workers, event producers, event consumers, scheduled jobs, and gateway components. Services MUST NOT treat observability as optional, best-effort, or deferred implementation work.

This specification is technology-agnostic. It defines required capabilities and observable behavior, not specific telemetry tools, storage backends, dashboards, agents, libraries, or infrastructure platforms.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trace a Request Across Services (Priority: P1)

An operator needs to trace a unit of work from the API Gateway through all participating services and message flows so that failures and latency can be diagnosed without guessing.

**Why this priority**: Distributed systems fail at boundaries. ForgeKit cannot be production-ready unless every request, event, and background operation can be connected through consistent correlation context.

**Independent Test**: A reviewer can inspect a service and confirm that incoming work has a correlation ID, outgoing calls and messages propagate that ID, and logs, metrics, and traces include correlation context.

**Acceptance Scenarios**:

1. **Given** an external request without a correlation ID, **When** it enters through the API Gateway, **Then** the gateway generates a correlation ID and propagates it to downstream services.
2. **Given** a service receives a request or message with a correlation ID, **When** the service logs, emits metrics, creates traces, calls another service, or publishes a message, **Then** the same correlation context remains attached to that unit of work.

---

### User Story 2 - Diagnose Failures Safely (Priority: P2)

A developer or operator needs error telemetry that identifies what failed, where it failed, and which unit of work was affected without exposing secrets or sensitive data.

**Why this priority**: Error diagnostics are only useful when they contain enough context to investigate incidents and only safe when they exclude sensitive information.

**Independent Test**: A reviewer can trigger or inspect representative failure paths and verify that error logs include correlation ID, service name, operation context, failure classification, and sanitized metadata.

**Acceptance Scenarios**:

1. **Given** a service encounters a validation error, dependency failure, or unexpected internal error, **When** the failure is logged, **Then** the log entry contains sufficient sanitized context and the correlation ID.
2. **Given** an error crosses a service boundary, **When** operators inspect logs and traces for the correlation ID, **Then** they can identify the originating service, downstream effects, and failure path.

---

### User Story 3 - Measure Service Behavior Consistently (Priority: P3)

A platform engineer needs all services to expose consistent operational signals so that request volume, error rate, latency, readiness, and liveness can be monitored uniformly.

**Why this priority**: Inconsistent metrics and health behavior prevent reliable operations, automated checks, capacity planning, and service comparison.

**Independent Test**: A reviewer can inspect each service and confirm that it exposes metrics or equivalent telemetry, captures mandatory service-level metrics, and provides accurate liveness and readiness signals.

**Acceptance Scenarios**:

1. **Given** a service handling API requests, messages, or scheduled work, **When** operational telemetry is reviewed, **Then** request or operation count, error rate, and latency are available.
2. **Given** a service is unhealthy or unable to handle traffic safely, **When** liveness and readiness signals are queried, **Then** the signals accurately represent process health and traffic readiness without exposing sensitive details.

---

### Edge Cases

- What happens when an external request arrives without a correlation ID?
- What happens when an external request arrives with a malformed, oversized, or untrusted correlation ID?
- How is correlation context preserved when synchronous request processing triggers asynchronous message publication?
- How is correlation context preserved when a message is retried, delayed, or moved to a failure channel?
- How does a service log an error when the error contains sensitive fields, credentials, tokens, or personal data?
- How does a service report readiness when one required dependency is unavailable but the process is still alive?
- How are long-running operations identified when they do not map directly to a single HTTP request?
- How does an implementation remain compliant when the chosen runtime does not expose HTTP endpoints?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Observability MUST be treated as a mandatory service capability for every ForgeKit service.
- **FR-002**: Every service MUST emit logs, metrics, and health signals sufficient to debug and monitor production-like behavior.
- **FR-003**: The system MUST support distributed tracing across services.
- **FR-004**: Correlation ID and trace context MUST be consistently available across logs, metrics, and traces to enable unified debugging across all observability signals.
- **FR-005**: Every externally initiated request MUST have a correlation ID before it reaches a downstream service.
- **FR-006**: If an incoming external request does not provide a correlation ID, the API Gateway MUST generate a UUIDv4 before forwarding the request.
- **FR-007**: The API Gateway MUST validate that incoming correlation IDs are valid UUIDv4 strings before trusting or propagating them.
- **FR-008**: Correlation ID MUST be propagated using exactly the `x-correlation-id` header for HTTP or an equivalent metadata field for non-HTTP transports. This correlation ID must exist independently of the chosen observability platform.
- **FR-009**: Correlation ID MUST remain immutable throughout the request lifecycle and MUST NOT be replaced, regenerated, or rewritten by downstream services.
- **FR-010**: Services MUST propagate the correlation ID across all synchronous service-to-service calls.
- **FR-011**: Services MUST propagate the correlation ID across all asynchronous messaging flows, including events, commands, retries, delayed processing, and failure channels.
- **FR-012**: Services MUST preserve correlation context across internal execution flows that produce logs, metrics, traces, errors, or downstream work.
- **FR-013**: An operation MUST be defined as a logical unit of work such as an API endpoint, message handler, or background job.
- **FR-014**: Logs MUST include correlation ID whenever the log entry relates to a request, message, job, operation, or service lifecycle event that can be associated with a unit of work.
- **FR-015**: Metrics MUST include correlation context when the metric type and cardinality constraints make request-scoped correlation safe and operationally appropriate.
- **FR-016**: Traces MUST include correlation context.
- **FR-017**: Error responses and failure events MUST include or reference a traceable request-scoped identifier such as the correlation ID or trace ID.
- **FR-018**: All service logs MUST be structured in JSON or an equivalent machine-parseable format.
- **FR-019**: Every log entry MUST include a timestamp.
- **FR-020**: Every log entry MUST include the service name.
- **FR-021**: Every log entry MUST include the log level.
- **FR-022**: Every log entry MUST include a human-readable message.
- **FR-023**: Every request-scoped or operation-scoped log entry MUST include the correlation ID.
- **FR-024**: Services MUST use log levels consistently with the meanings defined by this specification.
- **FR-025**: `info` logs MUST describe normal lifecycle events, request or operation completion, and significant state transitions.
- **FR-026**: `warn` logs MUST describe recoverable problems, degraded behavior, invalid external input, retryable failures, or conditions requiring operator awareness without immediate failure.
- **FR-027**: `error` logs MUST describe failed operations, unrecoverable errors, exhausted retries, unexpected exceptions, dependency failures that affect service behavior, and failures requiring investigation.
- **FR-028**: `debug` logs MAY be used to describe detailed execution steps, but MUST NOT be active by default in production environments.
- **FR-029**: Services MUST NOT log secrets, raw credentials, raw tokens, private keys, connection strings containing credentials, sensitive personal data, or full payloads that may contain sensitive fields.
- **FR-030**: Services MUST sanitize or omit sensitive fields before writing logs, trace attributes, metric labels, error responses, or events.
- **FR-031**: Services SHOULD use shared observability utilities (as permitted in FR-080) to implement a consistent sanitization strategy across all log entries.
- **FR-032**: Logs MUST include contextual metadata when applicable, including request path, operation name, and status outcome.
- **FR-033**: Logs SHOULD include additional contextual metadata needed for diagnosis, such as method, event name, dependency name, entity identifier, retry attempt, failure classification, and duration.
- **FR-034**: Log metadata MUST avoid high-risk values that expose sensitive data or create unbounded cardinality without operational value.
- **FR-035**: Every service MUST expose a metrics endpoint or equivalent telemetry mechanism appropriate to its runtime model.
- **FR-036**: Services MUST capture total request count or total operation count for all externally triggered and scheduled units of work.
- **FR-037**: Services MUST capture error count for requests, messages, jobs, and key operations.
- **FR-038**: Services MUST capture error rate for requests, messages, jobs, and key operations.
- **FR-039**: Services MUST distinguish between successful and failed operations in metrics.
- **FR-040**: Services MUST capture latency per key operation.
- **FR-041**: Latency metrics MUST include average latency and percentile latency where applicable.
- **FR-042**: Services MUST capture latency for incoming API requests when the service exposes an API.
- **FR-043**: Services MUST capture latency for message handling when the service consumes messages.
- **FR-044**: Services MUST capture latency for key dependency calls that materially affect service behavior.
- **FR-045**: Metrics MUST include service name as a label for all emitted metrics.
- **FR-046**: Metrics SHOULD be labeled by endpoint or operation and status.
- **FR-047**: Metrics SHOULD avoid high-cardinality labels that could impact performance and storage.
- **FR-048**: Metric labels MUST NOT contain secrets, raw tokens, credentials, sensitive personal data, request bodies, full URLs with query strings, or unbounded user-controlled values.
- **FR-049**: Metrics naming and dimensions MUST be consistent enough across services for operators to compare request count, error count, error rate, and latency without service-specific interpretation.
- **FR-050**: Trace context (e.g., OpenTelemetry traceparent) MUST be propagated across all communication boundaries alongside the custom Correlation ID. The application MUST propagate both the business correlation ID (`x-correlation-id`) and the official trace context.
- **FR-051**: Trace context MUST be propagated across HTTP or equivalent synchronous protocols.
- **FR-052**: Trace context MUST be propagated across messaging metadata.
- **FR-053**: Trace context MUST be propagated across service-to-service calls, event publication, event consumption, retries, delayed processing, and failure channels.
- **FR-054**: Each service MUST create a span or equivalent trace segment for every incoming request.
- **FR-055**: Each service MUST create a span or equivalent trace segment for every consumed message.
- **FR-056**: Each service MUST create spans or equivalent trace segments for significant internal operations, including key dependency calls, persistence operations, message publication, and long-running business operations.
- **FR-057**: Trace attributes MUST be sanitized and MUST NOT expose sensitive data.
- **FR-058**: Distributed tracing SHOULD support sampling strategies to balance observability depth and system performance.
- **FR-059**: Every service MUST expose a liveness endpoint or equivalent liveness signal.
- **FR-060**: Every service MUST expose a readiness endpoint or equivalent readiness signal.
- **FR-061**: Liveness endpoints or equivalent liveness signals MUST reflect only process health.
- **FR-062**: Liveness endpoints or equivalent liveness signals MUST NOT depend on external systems.
- **FR-063**: Liveness checks MUST NOT fail because an external dependency is unavailable.
- **FR-064**: Readiness endpoints or equivalent readiness signals MUST reflect whether the service can safely receive traffic, process requests, consume messages, or execute scheduled work.
- **FR-065**: Readiness endpoints MUST fail if essential synchronous dependencies fail, but MAY ignore non-critical asynchronous dependencies.
- **FR-066**: Health and readiness responses MUST be accurate and MUST NOT report healthy or ready status when the service cannot perform its required work.
- **FR-067**: Health and readiness responses MUST NOT expose sensitive internal details, credentials, topology secrets, stack traces, or raw dependency error messages.
- **FR-068**: Services MUST document which dependencies affect readiness and which conditions affect liveness.
- **FR-069**: All errors that affect request handling, message handling, scheduled work, startup, shutdown, dependency communication, or data consistency MUST be logged.
- **FR-070**: Error logs MUST include correlation ID when the error is associated with a unit of work.
- **FR-071**: Error logs MUST include relevant sanitized metadata sufficient to classify the failure and identify the affected operation.
- **FR-072**: Error logs MUST include stack trace or equivalent diagnostic information where applicable.
- **FR-073**: Error logs MUST distinguish expected validation or business failures from dependency failures and unexpected internal failures.
- **FR-074**: The system SHOULD allow operators to trace errors across service boundaries using correlation IDs and trace context.
- **FR-075**: Services MUST capture latency for key operations that affect user experience, message processing, dependency behavior, or business workflows.
- **FR-076**: Long-running operations SHOULD be identifiable through logs, metrics, or traces.
- **FR-077**: Long-running operation telemetry MUST include operation name, duration, outcome, service name, and correlation ID when request-scoped.
- **FR-078**: Observability behavior MUST be consistent across all ForgeKit services.
- **FR-079**: Service-specific telemetry formats, field names, log levels, correlation metadata, or health semantics MUST NOT diverge from this specification without an approved architecture exception.
- **FR-080**: Shared observability utilities MAY be used to enforce consistency across services.
- **FR-081**: Shared observability utilities MUST NOT hide required telemetry behavior from reviewers or prevent services from satisfying this specification.
- **FR-082**: New services MUST satisfy this specification before they are considered production-ready.
- **FR-083**: Existing services modified after adoption of this specification MUST preserve or improve compliance with these observability requirements.
- **FR-084**: This specification MUST NOT mandate a specific observability vendor, dashboard system, metrics backend, log collector, tracing backend, runtime agent, programming language, or framework.
- **FR-085**: This specification MUST NOT define infrastructure-level observability setup, including deployment of collectors, dashboards, alert routing, storage retention, or platform provisioning.

### Key Entities

- **Observability Signal**: A log, metric, trace, health signal, or error diagnostic emitted by a service to explain behavior, measure performance, or support diagnosis.
- **Operation**: A logical unit of work such as an API endpoint, message handler, or background job.
- **Correlation ID**: An immutable request-scoped or unit-of-work-scoped UUIDv4 generated at the API Gateway when absent and propagated through exactly the `x-correlation-id` header or metadata field across services, messages, logs, metrics, traces, and errors. It works alongside standard trace contexts.
- **Trace Context**: Metadata that connects spans or trace segments across all synchronous, asynchronous, and internal communication boundaries.
- **Structured Log**: A machine-parseable log record containing required fields and sanitized contextual metadata.
- **Metric**: A quantitative measurement of service behavior labeled by service name and including total request count, total operation count, error count, error rate, success or failure outcome, and latency.
- **Span**: A trace segment representing an incoming request, consumed message, significant internal operation, dependency call, persistence operation, message publication, or key business operation.
- **Liveness Signal**: A health signal indicating only whether a service process is alive and should continue running without evaluating external system health.
- **Readiness Signal**: A health signal indicating whether a service and its required dependencies can safely receive traffic, process requests, consume messages, or execute scheduled work.
- **Sensitive Data**: Secrets, credentials, raw tokens, private keys, connection strings containing credentials, personal data, confidential business data, or payload fields that must not be exposed through telemetry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer can verify within 15 minutes that a service generates, accepts, validates, logs, and propagates correlation IDs according to this specification.
- **SC-002**: A reviewer can inspect representative logs from a service and confirm that required log fields are present and sensitive data is absent.
- **SC-003**: A reviewer can confirm that each service exposes metrics or equivalent telemetry labeled by service name for total request or operation count, error count, error rate, latency, and success or failure outcome.
- **SC-004**: A reviewer can confirm that each service exposes accurate liveness and readiness signals and that dependency failures affect readiness but not liveness unless the process itself is unhealthy.
- **SC-005**: A reviewer can trace a representative failure across service boundaries and telemetry layers using shared identifiers, including correlation ID and trace context.
- **SC-006**: A reviewer can confirm that long-running and key operations expose enough telemetry to identify duration, outcome, service, and affected unit of work.
- **SC-007**: A new ForgeKit service cannot be classified as production-ready unless it satisfies all mandatory observability requirements in this specification.

## Non-Goals

- This specification MUST NOT enforce specific observability tools such as Prometheus, Grafana, OpenTelemetry, Jaeger, Datadog, New Relic, Loki, Elasticsearch, or any equivalent product.
- This specification MUST NOT define infrastructure-level observability setup, including collectors, agents, dashboards, alert rules, retention policies, storage backends, network topology, or deployment manifests.
- This specification MUST NOT prescribe programming-language-specific logging, metrics, or tracing libraries.
- This specification MUST NOT define business-specific service-level objectives, alert thresholds, on-call processes, or incident response procedures.
- This specification MUST NOT require every implementation to use HTTP endpoints when an equivalent telemetry mechanism is more appropriate for the runtime model.

## Assumptions

- The API Gateway remains the controlled entry point for external traffic and is responsible for generating correlation IDs when they are absent.
- ForgeKit services may use different languages, frameworks, and telemetry libraries as long as their observable behavior satisfies this specification.
- The architecture specification remains the source of truth for gateway responsibilities, messaging patterns, identity propagation, and cross-service communication boundaries.
- The service implementation standards remain the source of truth for service layering, operational endpoints, error handling, and runtime behavior.
- Infrastructure-specific telemetry collection, visualization, alerting, and retention are handled by deployment and operations planning outside this specification.
