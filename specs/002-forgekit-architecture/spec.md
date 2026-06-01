# Feature Specification: ForgeKit Architecture Reference

**Feature Branch**: `002-forgekit-architecture`
**Created**: 2026-04-15
**Status**: Approved
**Input**: User description: "Create the architecture specification for the project \"ForgeKit\". This specification must define the high-level architectural decisions and communication patterns that all services in the system must follow. The goal is to provide a clear, opinionated, and production-ready architecture without going into low-level implementation details."

## Architectural Overview

ForgeKit defines an opinionated, production-ready microservices architecture intended to remove ambiguity in how services are structured, how they communicate, and how they behave under failure.

The system architecture consists of:

- A single API Gateway as the controlled entry point for external traffic
- Independently deployable microservices with explicitly bounded responsibilities
- A messaging backbone for asynchronous communication and cross-service reactions
- A database per service, with strict ownership boundaries

This architecture is designed to enforce consistency across services while supporting scalability, maintainability, and fault tolerance. Service teams are expected to conform to this model rather than invent service-specific architectural patterns.

## Architectural Direction

ForgeKit follows these architectural rules:

- The API Gateway is the single public entry point to the system
- Services are independently deployable and independently evolvable
- Each service owns its own data and is the sole authority over that data
- Synchronous communication is reserved for request/response interactions that require immediate feedback
- Asynchronous, event-driven communication is the preferred mechanism for decoupled workflows and cross-service reactions
- Partial failure is expected and must be contained without cascading system-wide disruption
- Eventual consistency is a first-class architectural principle for distributed workflows

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define a Standard Service Architecture (Priority: P1)

A platform engineer needs a single architectural reference that defines how every ForgeKit service must be structured, how service boundaries are enforced, and how data ownership works across the system.

**Why this priority**: Without a mandatory architectural baseline, every service risks drifting into incompatible patterns, undermining the purpose of ForgeKit as a consistent production starter.

**Independent Test**: A reviewer can inspect the architecture specification alone and determine whether a proposed service design complies with the required service boundaries, deployability rules, and data ownership model.

**Acceptance Scenarios**:

1. **Given** a team designing a new service, **When** they read the architecture specification, **Then** they can identify that the service must be independently deployable, must own its own database, and must not access another service's database directly.
2. **Given** a proposed service interaction design, **When** the team validates it against the specification, **Then** they can determine whether the design respects clear service boundaries and approved integration patterns.

---

### User Story 2 - Standardize Communication Patterns (Priority: P2)

A service team needs clear rules for when to use synchronous communication and when to use asynchronous messaging so that inter-service communication remains predictable, scalable, and consistent.

**Why this priority**: Communication decisions drive coupling, scalability, and operational complexity. ForgeKit must prescribe these patterns to prevent inconsistent integration behavior across services.

**Independent Test**: A reviewer can evaluate an interaction flow and decide whether it correctly uses HTTP/gRPC for immediate request/response needs and event-driven messaging for decoupled workflows.

**Acceptance Scenarios**:

1. **Given** a workflow that requires immediate user feedback, **When** the team consults the architecture specification, **Then** it directs them to use synchronous communication through approved request/response patterns.
2. **Given** a workflow that triggers downstream reactions across multiple services, **When** the team consults the architecture specification, **Then** it directs them to use asynchronous event-driven messaging with a broker-backed event flow.

---

### User Story 3 - Define Production-Ready Cross-Cutting Rules (Priority: P3)

An architecture reviewer needs the specification to define mandatory production standards for resilience, security, identity propagation, and observability so every service can participate in the system safely and consistently.

**Why this priority**: A microservices architecture is not production-ready if communication rules exist without accompanying standards for failure handling, identity, and tracing.

**Independent Test**: A reviewer can inspect the specification and verify that it defines mandatory retry behavior, DLQ usage, correlation ID propagation, API Gateway responsibilities, and identity context propagation.

**Acceptance Scenarios**:

1. **Given** a service consuming events from the messaging backbone, **When** the reviewer checks the specification, **Then** it requires idempotent consumers, retry strategies, DLQ handling, and support for event versioning.
2. **Given** an authenticated request entering the system, **When** the reviewer checks the specification, **Then** it requires authentication at the API Gateway, propagation of standardized identity context, and downstream reliance on propagated claims instead of re-authentication.

---

### Edge Cases

- What happens when a consumer receives the same event more than once due to broker redelivery?
- How does the system handle an event schema change while older consumers are still active?
- What happens when a downstream service is unavailable during a synchronous request chain?
- How does the architecture handle workflows that require immediate acknowledgement but complete asynchronously?
- What happens when a team attempts to bypass APIs or events and read another service's data store directly?
- How should teams decide between synchronous and asynchronous communication when consistency requirements conflict with scalability goals?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The architecture specification MUST define the overall system structure as an API Gateway, independently deployable microservices, a messaging backbone for asynchronous communication, and a database per service.
- **FR-002**: The architecture specification MUST state that ForgeKit is opinionated and that service teams are expected to conform to a common production-ready architectural model.
- **FR-003**: Every service MUST be independently deployable, buildable, and evolvable without requiring direct coordination with unrelated services.
- **FR-004**: Every service MUST own its own database and MUST be the sole authority over that data.
- **FR-005**: Services MUST NOT directly access another service's database.
- **FR-006**: Cross-service data access MUST occur through defined APIs or events and MUST NEVER occur through direct database access.
- **FR-007**: Synchronous communication using HTTP and/or gRPC MUST be used for request/response interactions that require immediate feedback.
- **FR-008**: Synchronous communication MUST implement timeouts to prevent resource exhaustion and cascading failures.
- **FR-009**: Timeout configurations SHOULD be standardized across services to ensure consistent behavior and avoid misconfiguration.
- **FR-010**: The architecture SHOULD support circuit breaker patterns for external or inter-service communication.
- **FR-011**: Asynchronous communication using event-driven messaging MUST be used for decoupled workflows and cross-service reactions.
- **FR-012**: The architecture SHOULD prioritize event-driven communication patterns where immediate response semantics are not required.
- **FR-013**: A message broker MUST serve as the backbone for asynchronous communication across services.
- **FR-014**: The architecture MUST define clear guidelines for selecting messaging patterns based on the use case.
- **FR-015**: Queue-based messaging MUST be used when a single consumer is responsible for processing a task, when work distribution or load balancing is required, or when the operation represents a command or unit of work.
- **FR-016**: Publish/subscribe messaging MUST be used when multiple independent services need to react to the same event, when the event represents a domain-level state change, or when consumers must remain decoupled and evolve independently.
- **FR-017**: Services MUST NOT use queue-based messaging for domain event propagation intended for multiple consumers.
- **FR-018**: Services SHOULD NOT use publish/subscribe for single-consumer task processing because it introduces unnecessary complexity.
- **FR-019**: The messaging system MUST assume at-least-once delivery semantics, requiring all consumers to be idempotent.
- **FR-020**: Events MUST represent domain-level state changes, not technical implementation events.
- **FR-021**: Events MUST follow a consistent naming convention that expresses domain and outcome semantics, such as `user.created` and `order.completed`.
- **FR-022**: Event producers MUST emit events after successful state changes relevant to other services.
- **FR-023**: Events MUST have versioned, validated schema contracts that preserve backward compatibility as producer and consumer contracts evolve.
- **FR-024**: Event schemas MUST be validated at both producer and consumer boundaries to ensure contract integrity.
- **FR-025**: The architecture SHOULD define a discoverable and documented event schema governance model.
- **FR-026**: Event consumers MUST be idempotent and MUST safely handle duplicate event delivery.
- **FR-027**: Retry strategies MUST be defined for transient failures, and those strategies MUST include bounded retry behavior such as exponential backoff.
- **FR-028**: Dead Letter Queues MUST be used for messages that cannot be processed successfully after retry exhaustion.
- **FR-029**: The architecture MUST require services and consumers to tolerate partial failures without causing cascading failures across the system.
- **FR-030**: The API Gateway MUST act as the single entry point for external traffic into the system.
- **FR-031**: The API Gateway MUST be responsible for request routing and traffic control.
- **FR-032**: The API Gateway MUST NOT contain business logic and MUST be limited to routing, authentication, and cross-cutting concerns.
- **FR-033**: Authentication MUST be enforced at the API Gateway level.
- **FR-034**: The architecture MUST support pluggable authentication mechanisms, including token-based and external identity-provider-based approaches.
- **FR-035**: All authenticated requests MUST propagate identity context to downstream services.
- **FR-036**: Propagated identity context MUST include standardized claims such as user identifier, roles, and permissions.
- **FR-037**: Identity context MUST be propagated using standardized request metadata (e.g., headers for synchronous communication and message metadata for asynchronous communication).
- **FR-038**: Downstream services MUST rely on propagated identity context and MUST NOT independently re-authenticate the same request.
- **FR-039**: Authorization SHOULD be performed using claims contained in the propagated identity context.
- **FR-040**: Sensitive data MUST NEVER be exposed in responses, events, logs, or tracing metadata.
- **FR-041**: All services MUST propagate a correlation ID across synchronous requests and asynchronous events.
- **FR-042**: Logging MUST be structured and consistent across services.
- **FR-043**: Logs MUST include enough contextual information to support debugging, tracing, and incident investigation, such as timestamp, service name, correlation ID, log level, message and relevant request metadata.
- **FR-044**: The architecture SHOULD support distributed tracing and metrics collection across services and message flows.
- **FR-045**: Eventual consistency MUST be treated as a core principle for event-driven workflows.
- **FR-046**: The specification MUST explicitly acknowledge trade-offs between consistency, availability, and architectural complexity in distributed workflows.
- **FR-047**: The specification SHOULD provide guidance for choosing synchronous communication when immediate feedback or strict request/response semantics are required and asynchronous communication when decoupling, resilience, or fan-out behavior is more important.
- **FR-048**: The architecture specification MUST state that infrastructure orchestration is out of scope.
- **FR-049**: The architecture specification MUST state that infrastructure provisioning details are out of scope.
- **FR-050**: The architecture specification MUST state that no specific programming language or framework is mandated by this architecture.
- **FR-051**: HTTP MUST be the default protocol for synchronous service-to-service request/response communication.
- **FR-052**: gRPC MAY be used for internal synchronous communication only when low-latency and strongly typed contracts are explicit requirements.
- **FR-053**: Synchronous timeout configuration MUST follow interaction classes: internal read, internal write, and external dependency.
- **FR-054**: Architecture-level timeout defaults MUST be 1 second connect timeout for all classes, 3 seconds request timeout for internal read/write, and 5 seconds request timeout for external dependency calls.
- **FR-055**: Synchronous interactions MUST define and enforce a hard maximum timeout of 10 seconds unless a documented architecture exception is approved.
- **FR-056**: Event consumer retry policy MUST classify failures into retryable and non-retryable categories before retry behavior is applied.
- **FR-057**: Retryable event-processing failures MUST use exponential backoff with jitter and MUST stop after a maximum of 3 attempts before routing the message to a Dead Letter Queue.
- **FR-058**: Non-retryable event-processing failures MUST bypass retry and be routed directly to a Dead Letter Queue or equivalent failure channel.
- **FR-059**: Event schema ownership MUST remain with the producing service, and each producer MUST publish discoverable versioned schema contracts.
- **FR-060**: A central architecture governance policy MUST define cross-service schema compatibility rules, review triggers, and escalation paths for schema changes.
- **FR-061**: Event schema changes that break backward compatibility MUST require explicit architecture review and a documented migration strategy before release.
- **FR-062**: For synchronous communication, identity context MUST use standardized headers `x-user-id`, `x-user-roles`, and `x-user-permissions`.
- **FR-063**: For asynchronous communication, identity context metadata MUST provide equivalents of `x-user-id`, `x-user-roles`, and `x-user-permissions` with the same semantics.
- **FR-064**: Token passthrough MAY be used as an additional transport mechanism for identity context, but downstream authorization decisions MUST rely on standardized propagated claims.

### Key Entities

- **Service**: An independently deployable unit with a clearly bounded responsibility, explicit contracts, and sole ownership of its own data.
- **Service Database**: The private persistence boundary owned by one service and inaccessible to other services except through published APIs or events.
- **API Gateway**: The single controlled entry point that authenticates requests, routes traffic, and propagates identity context into the service ecosystem.
- **Message Broker**: The shared and reliable asynchronous backbone that transports domain events between producers and consumers.
- **Domain Event**: A versioned record of a meaningful state change emitted by a producer for downstream consumers.
- **Dead Letter Queue**: The isolated holding channel for messages that could not be processed successfully after configured retry attempts.
- **Identity Context**: The standardized authentication and authorization claims propagated from the API Gateway to downstream services.
- **Correlation ID**: The tracing identifier propagated through requests and events to connect logs, traces, and operational diagnostics across service boundaries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer can determine whether a proposed service architecture complies with ForgeKit service-boundary and data-ownership rules within 15 minutes using this specification alone.
- **SC-002**: A reviewer can classify a proposed interaction as synchronous, queue-based asynchronous, or publish/subscribe asynchronous according to this specification within 10 minutes and identify the applicable messaging-pattern rule set without escalation.
- **SC-003**: All new service designs derived from this specification explicitly document database ownership, service boundaries, and external contracts before implementation begins.
- **SC-004**: An architecture review can confirm that every proposed synchronous interaction defines immediate-response justification, timeout behavior, and failure containment before approval.
- **SC-005**: An architecture review can confirm that every proposed asynchronous workflow includes broker usage, event naming, schema contract definition, idempotent consumption behavior, retry handling, and DLQ handling before approval.
- **SC-006**: An architecture review can confirm that every externally reachable request path includes API Gateway authentication, identity propagation, and correlation ID propagation before approval.

## Assumptions

- ForgeKit is intended to serve as a backend-focused microservices foundation rather than a complete infrastructure platform definition.
- Teams adopting ForgeKit accept opinionated architectural constraints in exchange for consistency, faster onboarding, and lower design ambiguity.
- Services may use different implementation technologies over time, provided they comply with the architectural contracts defined in this specification.
- Some workflows will require eventual consistency rather than strict transactional consistency across service boundaries.
- Infrastructure runtime choices, orchestration platforms, and provisioning tooling will be decided separately from this architecture specification.
