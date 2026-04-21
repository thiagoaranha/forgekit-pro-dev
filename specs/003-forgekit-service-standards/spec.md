# Feature Specification: ForgeKit Service Template and Implementation Standards

**Feature Branch**: `003-forgekit-service-standards`
**Created**: 2026-04-16
**Status**: Approved
**Input**: User description: "Create the service template and implementation standards specification for the project 'ForgeKit'."

## Implementation Standard Overview

This specification defines the mandatory implementation standard for every service built within ForgeKit.

It establishes how services MUST be structured, how code MUST be organized, how configuration and runtime behavior MUST be handled, and which production-readiness requirements every service MUST satisfy before it is considered compliant.

ForgeKit does not permit service-specific implementation styles that diverge from this standard. Teams MAY choose different programming languages or frameworks, but they MUST produce services that conform to the same structural, operational, testing, security, and observability rules.

This specification is subordinate to the ForgeKit constitution and aligned with the architecture reference. If a local implementation preference conflicts with this document, this document takes precedence. If this document conflicts with the constitution, the constitution takes precedence.

## Standard Service Model

Every ForgeKit service MUST be implemented as a layered unit with explicit boundaries between transport concerns, application orchestration, domain logic, and infrastructure integration.

Every service MUST expose a minimal observable structure that makes the separation of transport, application, domain, and infrastructure layers visible and reviewable, even when the exact file or package layout is adapted to the conventions of a specific language ecosystem.

The standard service model consists of:

- A transport layer responsible for external protocols, request parsing, response mapping, input validation at the boundary, and metadata propagation.
- An application layer responsible for use-case orchestration, transaction boundaries, coordination of dependencies, and invocation of domain behavior.
- A domain layer responsible for business rules, invariants, decision-making, and domain-level concepts independent of transport or infrastructure details.
- An infrastructure layer responsible for persistence, broker integration, external clients, framework bindings, and other technical adapters.
- A configuration boundary responsible for loading and validating runtime configuration from external sources.
- Operational endpoints and runtime hooks for health checks, metrics, graceful shutdown, and observability integration.

Dependencies MUST point inward toward the domain and application core. Domain logic MUST NOT depend directly on frameworks, transport concerns, databases, message brokers, or environment-specific runtime APIs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a Compliant Service Skeleton (Priority: P1)

A developer or platform engineer needs a definitive standard for how a ForgeKit service must be structured so that every new service starts from the same maintainable and production-ready baseline.

**Why this priority**: Without a strict implementation standard, the architecture degrades immediately into inconsistent service layouts, unclear module boundaries, and code that becomes expensive to maintain.

**Independent Test**: A reviewer can inspect a newly created service and determine whether it complies with required layers, runtime behavior, configuration handling, testing expectations, and operational endpoints using this specification alone.

**Acceptance Scenarios**:

1. **Given** a team creating a new service, **When** they follow this specification, **Then** the resulting service separates transport, application, domain, and infrastructure responsibilities without cross-layer leakage.
2. **Given** a proposed service implementation, **When** a reviewer evaluates it against this specification, **Then** the reviewer can determine whether the service meets ForgeKit structure, runtime, testing, and observability requirements without relying on language-specific conventions.

---

### User Story 2 - Enforce Consistent Implementation Quality (Priority: P2)

A code reviewer needs a prescriptive implementation reference to verify that service code is clean, testable, secure, observable, and free from unnecessary coupling or over-engineering.

**Why this priority**: A service starter kit fails if each team interprets quality standards differently. Consistency across implementation practices is required for long-term maintainability and reliable reviews.

**Independent Test**: A reviewer can inspect a service codebase, configuration model, tests, logging behavior, API contracts, and error-handling rules and classify the service as compliant or non-compliant with this standard.

**Acceptance Scenarios**:

1. **Given** a service implementation under review, **When** the reviewer inspects code organization and module responsibilities, **Then** the reviewer can confirm that functions are focused, names are clear, dependencies are bounded, and unnecessary abstraction is absent.
2. **Given** a service exposing APIs and consuming events, **When** the reviewer checks boundary validation, error responses, logs, and messaging behavior, **Then** the reviewer can verify consistent contract handling, idempotent consumption, and protection of sensitive data.

---

### User Story 3 - Standardize Developer and Runtime Behavior (Priority: P3)

A developer needs every ForgeKit service to behave consistently during local development, startup, shutdown, testing, and operational diagnostics so that moving between services does not require relearning service-specific workflows.

**Why this priority**: Developer productivity and production readiness both depend on services exposing predictable commands, health signals, and observability behavior.

**Independent Test**: A developer can run, test, build, and inspect any compliant service using the documented standard workflow and confirm that it exposes health checks, honors externalized configuration, emits structured logs, and shuts down gracefully.

**Acceptance Scenarios**:

1. **Given** a developer working on any ForgeKit service, **When** they use the service's documented run, test, and build commands, **Then** those commands behave consistently with the standard defined in this specification.
2. **Given** a service receiving a shutdown signal or failing a dependency check, **When** runtime behavior is evaluated, **Then** the service exposes readiness and liveness status correctly and terminates in a controlled manner without corrupting in-flight work.

---

### Edge Cases

- What happens when a service receives configuration with missing required values or invalid formats at startup?
- How does a service behave when it receives malformed input, unknown fields, or invalid identity metadata at an API or messaging boundary?
- What happens when a consumer receives duplicate events, out-of-order events, or an unsupported event version?
- How does a service report failures when a downstream dependency is unavailable without leaking secrets or internal implementation details?
- What happens when a service starts successfully but one of its required dependencies is not yet ready?
- How should a team handle shared utility code without violating service boundaries or introducing tight coupling?
- What happens when a service is technically functional but fails to meet the minimum test coverage or required operational endpoints?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every ForgeKit service MUST follow a standard implementation structure that separates transport, application, domain, and infrastructure responsibilities.
- **FR-002**: Every service MUST organize code so that transport concerns are isolated from business rules and infrastructure details.
- **FR-003**: The transport layer MUST be limited to protocol handling, boundary validation, request and response mapping, authentication metadata handling, and correlation ID propagation.
- **FR-004**: The application layer MUST orchestrate use cases, coordinate dependencies, enforce execution flow, and invoke domain behavior without embedding transport or infrastructure concerns.
- **FR-005**: The domain layer MUST contain business rules, invariants, and domain decision logic and MUST remain independent from transport frameworks, persistence frameworks, and broker clients.
- **FR-006**: The infrastructure layer MUST contain technical adapters such as persistence implementations, broker integrations, framework wiring, and external service clients.
- **FR-007**: Dependencies between modules MUST point toward stable business abstractions and MUST NOT introduce cyclic coupling between layers.
- **FR-008**: Services MUST define module responsibilities clearly enough that a reviewer can identify where transport logic ends and business logic begins.
- **FR-009**: Services MUST use clear, intention-revealing names for modules, functions, types, and endpoints.
- **FR-010**: Functions and methods MUST be small, focused, and responsible for one coherent behavior.
- **FR-011**: Services MUST prefer simple designs that satisfy current requirements and MUST NOT introduce speculative abstractions, generic extension points, or indirection without concrete need.
- **FR-012**: Shared code MUST be minimized and MUST only be extracted when duplication creates a clear maintenance burden and the shared abstraction does not introduce coupling between service domains.
- **FR-013**: Service modules MUST remain loosely coupled and MUST communicate through explicit contracts rather than hidden shared state.
- **FR-014**: Configuration MUST be externalized from source code and loaded from environment-aware runtime configuration sources.
- **FR-015**: Services MUST validate required configuration at startup and MUST fail fast when configuration is missing, malformed, or unsafe.
- **FR-016**: Secrets MUST NOT be hardcoded, committed to version control, or embedded in default configuration artifacts.
- **FR-017**: Secrets MUST be supplied through secure external mechanisms such as environment variables or secret-management integrations chosen during planning and implementation.
- **FR-018**: Services MUST document required configuration variables, optional configuration variables, defaults, and security-sensitive settings.
- **FR-019**: All services MUST emit structured logs in a machine-parseable format.
- **FR-020**: Every log entry MUST include at minimum a timestamp, service name, log level, message, and correlation ID.
- **FR-021**: Logs SHOULD include additional contextual metadata needed for diagnosis, such as operation name, request path, event name, entity identifiers, and failure classification, provided that no sensitive data is exposed.
- **FR-022**: Services MUST propagate correlation IDs across synchronous requests, asynchronous event handling, and internal execution flows that produce logs or telemetry.
- **FR-023**: Services MUST implement a consistent error-handling strategy that distinguishes expected business errors, validation failures, dependency failures, and unexpected internal errors.
- **FR-024**: Error responses and error events MUST be meaningful to consumers and MUST use stable, documented error semantics.
- **FR-025**: Services MUST log enough context to trace failures while ensuring that secrets, tokens, credentials, and sensitive personal data are never exposed in logs, responses, traces, or events.
- **FR-026**: Unexpected internal errors MUST be translated into sanitized outward-facing failures that do not reveal stack traces, infrastructure topology, credential material, or internal implementation details.
- **FR-027**: Every service MUST maintain a minimum of 80% automated line coverage across unit and integration tests.
- **FR-028**: Services MUST include unit tests for domain logic, business rules, validation behavior, and application-layer decision paths.
- **FR-029**: Services MUST include integration tests for boundary contracts such as HTTP or RPC handlers, persistence integrations, message handling, and infrastructure adapters where those adapters are part of the service scope.
- **FR-030**: Tests MUST be deterministic, reliable, and fast enough to support routine local execution and continuous integration.
- **FR-031**: Flaky tests, order-dependent tests, and tests that depend on uncontrolled shared state are prohibited.
- **FR-032**: Critical business logic MUST always be directly tested regardless of aggregate coverage metrics.
- **FR-033**: APIs exposed by services MUST use clear, explicit contracts with predictable request and response semantics.
- **FR-034**: Service APIs MUST validate all external input at the boundary before invoking application or domain logic.
- **FR-035**: Service APIs MUST return consistent response structures for successful results and error outcomes as defined by the service contract.
- **FR-036**: All external and inter-service APIs MUST support versioning so that contract evolution can occur without ambiguous breaking changes.
- **FR-037**: Service APIs MUST be documented in a form that reviewers and consumers can inspect before integration begins.
- **FR-038**: Services producing events MUST emit domain-relevant events aligned with the communication rules defined in the architecture specification.
- **FR-039**: Services consuming events MUST implement idempotent processing and MUST safely tolerate duplicate delivery.
- **FR-040**: Services MUST validate event payloads and event metadata before processing them.
- **FR-041**: Services MUST apply the messaging-pattern selection rules from the architecture specification and MUST NOT misuse queue-based messaging for multi-consumer domain event propagation.
- **FR-042**: Event producers and consumers MUST preserve event versioning and contract compatibility rules defined in the architecture specification.
- **FR-043**: Services MUST enforce input validation, output sanitization, and data protection as baseline secure coding practices.
- **FR-044**: Services MUST rely on propagated identity context for authenticated request processing and MUST NOT independently re-authenticate requests that have already been authenticated at the API Gateway.
- **FR-045**: Services MUST authorize protected operations using propagated identity claims and local authorization rules appropriate to the service responsibility.
- **FR-046**: Services MUST NOT expose secrets, credentials, raw tokens, or unnecessary identity claims in logs, events, metrics labels, or API responses.
- **FR-047**: Services MUST propagate correlation IDs and other required request or message metadata so that a unit of work can be traced across API and messaging boundaries.
- **FR-048**: Services MUST emit logs and support metrics collection needed to observe request rate, error rate, latency, and dependency behavior.
- **FR-049**: Services SHOULD support distributed tracing instrumentation compatible with the observability model defined during planning.
- **FR-050**: Every service MUST start through a standard entrypoint that loads configuration, initializes dependencies, registers transport handlers, and exposes operational endpoints.
- **FR-051**: Every service MUST expose liveness and readiness health-check endpoints or equivalent health signals appropriate to its transport model.
- **FR-052**: Liveness checks MUST reflect only process health and MUST NOT depend on external systems.
- **FR-053**: Services MUST shut down gracefully by rejecting new work, allowing in-flight work to complete within defined limits, closing resources safely, and emitting shutdown diagnostics.
- **FR-054**: Each service MUST provide consistent and standardized commands for local run, test, and build operations across all services.
- **FR-055**: Service documentation MUST describe how to start the service locally, run tests, build artifacts, provide configuration, and verify health checks.
- **FR-056**: Local developer workflows SHOULD minimize unnecessary prerequisites and SHOULD enable a developer to run and validate a service without undocumented setup steps.
- **FR-057**: This specification MUST define mandatory implementation behavior and MUST clearly distinguish mandatory requirements from recommended practices.
- **FR-058**: This specification MUST NOT mandate any specific programming language, framework, ORM, broker client, HTTP library, or testing library.
- **FR-059**: This specification MUST NOT define infrastructure provisioning, deployment platform selection, or orchestration runtime details.
- **FR-060**: Dependencies between layers MUST follow a strict inward direction, where outer layers depend on inner layers, and inner layers MUST NOT depend on outer layers.
- **FR-061**: Transport layer models MUST be mapped to internal application or domain models and MUST NOT be used directly within domain logic.
- **FR-062**: Error responses MUST follow a consistent structure that includes an error code, a human-readable message, and a traceable identifier.
- **FR-063**: Services MUST emit metrics that include request count, error rate, and latency for key operations.
- **FR-064**: Services MUST expose a minimal observable structure that makes transport, application, domain, and infrastructure boundaries reviewable even when adapted to language-specific conventions.
- **FR-065**: Branch coverage SHOULD be collected and encouraged in addition to the mandatory automated line coverage baseline.
- **FR-066**: The traceable identifier in error responses MUST be the correlation ID, trace ID, or another standardized request-scoped identifier that allows operators to connect the failure to logs and telemetry.
- **FR-067**: Internal service interfaces that are not exposed externally and are not used for inter-service communication do not require versioning.
- **FR-068**: Readiness checks MUST reflect whether the service can safely handle traffic or messages and MAY depend on required internal or external dependencies.
- **FR-069**: Services MUST document which dependencies affect readiness and MUST ensure those dependencies do not affect liveness checks.

### Key Entities

- **ForgeKit Service**: An independently deployable service implementation that conforms to the ForgeKit constitution, architecture rules, and implementation standards defined in this specification.
- **Transport Layer**: The boundary-facing layer that handles protocols, validation at entry points, metadata propagation, and response mapping.
- **Application Layer**: The orchestration layer that coordinates use cases, transactions, and execution flow without owning domain rules or infrastructure details.
- **Domain Layer**: The business core where domain rules, invariants, entities, value concepts, and policy decisions are implemented independently of frameworks.
- **Infrastructure Layer**: The adapter layer that integrates persistence, brokers, framework bindings, external clients, and runtime technologies.
- **Configuration Contract**: The defined set of externalized runtime settings, defaults, validation rules, and secret-handling rules required by a service.
- **Operational Endpoint**: A runtime-accessible health, diagnostics, or telemetry surface used to assess service health and behavior.
- **Service Contract**: The documented API or event interface through which a service interacts with external consumers or other services.
- **Standardized Error Contract**: The required outward-facing error structure containing a stable error code, a human-readable message, and a traceable request-scoped identifier.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer can determine whether a service complies with the required ForgeKit service structure, layer responsibilities, and dependency boundaries within 15 minutes using this specification alone.
- **SC-002**: A reviewer can verify within 15 minutes that a service externalizes configuration correctly, validates required settings at startup, and avoids hardcoded secrets.
- **SC-003**: A reviewer can confirm that a service meets the mandatory logging, correlation ID propagation, error-handling, and observability requirements within a single implementation review session.
- **SC-004**: Every new ForgeKit service derived from this standard documents its run, test, build, configuration, health-check, and contract usage workflow before implementation is considered complete.
- **SC-005**: An implementation review can confirm that every service contains unit and integration tests, directly tests critical business logic, and enforces a minimum of 80% automated coverage before approval.
- **SC-006**: An implementation review can confirm that every service exposing APIs or events applies boundary validation, version-aware contracts, idempotent event consumption, and sanitized failure behavior before approval.

## Assumptions

- ForgeKit will provide service templates, examples, or scaffolding in future planning and implementation phases, but this specification defines the standard those artifacts MUST satisfy rather than the concrete tooling.
- Teams may implement services with different languages and frameworks, provided the resulting services satisfy all mandatory ForgeKit implementation behaviors.
- The architecture specification remains the source of truth for messaging-pattern selection, identity propagation model, and cross-service communication boundaries.
- The constitution remains the source of truth for project-wide governance, including the non-negotiable 80% coverage threshold, secure coding posture, observability requirements, and clean-code expectations.
- Infrastructure provisioning, deployment topology, runtime orchestration, and platform-specific operational tooling are intentionally out of scope for this specification.
