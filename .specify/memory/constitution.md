<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0
Bump rationale: Initial constitution — MAJOR version for baseline governance.

Modified principles: (none — new document)

Added sections:
  - I. Clean Code & Readability
  - II. Testing Standards (80% Minimum Coverage)
  - III. Performance & Concurrency
  - IV. Security by Default
  - V. Observability & Traceability
  - VI. Microservices Architecture Boundaries
  - VII. AI-Assisted Development Governance
  - Security Requirements (additional constraints)
  - Development Workflow & Quality Gates
  - Governance (amendment procedure, versioning policy, compliance)

Removed sections: (none)

Templates requiring updates:
  - .specify/templates/plan-template.md          ✅ No change needed — Constitution Check section is generic
  - .specify/templates/spec-template.md           ✅ No change needed — spec template is requirement-agnostic
  - .specify/templates/tasks-template.md          ✅ No change needed — task template supports test gates generically
  - .qwen/commands/speckit.*.md                   ✅ No change needed — no agent-specific references found

Deferred items: (none)
-->

# forgeKit Constitution

## Core Principles

### I. Clean Code & Readability

All code MUST adhere to clean code principles without exception:

- **Readability first**: Code must be self-documenting through clear naming conventions, small focused functions, and logical separation of concerns.
- **No over-engineering**: Solutions must be as simple as possible while meeting production requirements. Avoid unnecessary abstraction layers, design patterns, or indirection.
- **Consistent structure**: Every service MUST follow the same architectural patterns, directory layout, and coding conventions established by the project.
- **Comments are a code smell**: If code requires comments to be understood, it must be refactored instead. Comments are only acceptable for explaining *why* a non-obvious decision was made — never *what* the code does.

**Rationale**: Readable, consistent code reduces cognitive load, accelerates onboarding, and minimizes defects across a multi-service codebase.

### II. Testing Standards (NON-NEGOTIABLE)

Every service MUST maintain a minimum of 80% code coverage measured across unit and integration tests:

- **Unit tests**: Required for all business logic, utility functions, and service-layer code.
- **Integration tests**: Required for inter-component communication, database operations, API contracts, and message handling.
- **Critical business logic**: MUST always be tested — no exceptions regardless of coverage metrics.
- **Test quality**: Tests MUST be reliable, deterministic, and fast. Flaky tests are unacceptable and must be fixed immediately.
- **Coverage gate**: CI/CD pipelines MUST enforce the 80% minimum threshold. Builds below this threshold MUST fail.

**Rationale**: High test coverage is the only verifiable guarantee that refactoring and feature additions do not introduce regressions in production systems.

### III. Performance & Concurrency

All services MUST be designed for high throughput and concurrent workloads:

- **Non-blocking operations**: Blocking I/O, synchronous waits, and thread-blocking calls are prohibited in request-handling paths.
- **Asynchronous patterns**: Event-driven and async/await patterns MUST be used where I/O-bound or latency-sensitive operations exist.
- **Resource efficiency**: Services MUST operate within defined CPU, memory, and I/O budgets. Resource leaks, unbounded queues, and uncontrolled memory growth are prohibited.
- **Concurrency-safe code**: Shared state MUST be protected with appropriate synchronization. Race conditions and deadlocks are critical defects.

**Rationale**: Production microservices must handle real-world traffic volumes without degradation or cascading failures.

### IV. Security by Default

Secure coding practices are mandatory — not optional:

- **Authentication & authorization**: Every endpoint MUST enforce identity verification and access control where applicable. No public endpoint may mutate state without explicit authorization.
- **No sensitive data in logs**: Secrets, tokens, passwords, PII, and any confidential data MUST NEVER appear in logs, error messages, or telemetry.
- **Input validation**: ALL external input (HTTP bodies, query parameters, headers, message payloads, environment variables) MUST be validated against a strict schema before processing.
- **Least privilege**: Each service MUST operate with the minimum permissions, network access, and resource scope required for its function.
- **Dependency security**: Third-party dependencies MUST be pinned, audited for known vulnerabilities, and updated promptly when CVEs are disclosed.

**Rationale**: Security breaches are often irreversible in production. Defaults must be secure; retrofitting security after the fact is insufficient.

### V. Observability & Traceability

Every service MUST be fully observable in production:

- **Structured logging**: All log output MUST be machine-parseable (JSON format preferred) and include at minimum: timestamp, log level, service name, and correlation ID.
- **Correlation/request IDs**: Every incoming request MUST be assigned or propagate a correlation ID. This ID MUST appear in all downstream log entries, traces, and error reports.
- **Contextual error logging**: Errors MUST include sufficient context (input parameters, state snapshots, stack traces) to enable root-cause analysis without reproducing the issue.
- **Metrics support**: Services MUST expose metrics hooks (request rate, error rate, latency percentiles, resource utilization) compatible with standard monitoring systems (e.g., Prometheus, OpenTelemetry).

**Rationale**: Without observability, production incidents become unresolvable guesswork. Observability is not a post-deployment addition — it is a design requirement.

### VI. Microservices Architecture Boundaries

The system follows strict microservices architecture rules:

- **Clear service boundaries**: Each service MUST have a single, well-defined responsibility. Cross-cutting concerns that do not belong to a specific domain are prohibited.
- **Independent deployability**: Every service MUST be buildable, testable, and deployable in isolation. No service may require a coordinated deployment with another to function correctly.
- **Data ownership**: Each service MUST own its data store. Direct database access to another service's data is prohibited — data must be accessed through defined APIs or event streams.
- **Communication patterns**: Inter-service communication MUST follow defined contracts — either synchronous HTTP/gRPC APIs with versioned endpoints or asynchronous message/event buses. Ad-hoc protocols are prohibited.
- **Fault isolation**: Services MUST implement circuit breakers, retries with backoff, and graceful degradation. A single service failure MUST NOT cascade to system-wide failure.

**Rationale**: Microservices only deliver value when boundaries are respected. Violating boundaries creates a distributed monolith — the worst of both worlds.

### VII. AI-Assisted Development Governance

AI-generated code is subject to the same standards as human-written code, with additional constraints:

- **Human review mandatory**: Every line of AI-generated code MUST be reviewed, understood, and approved by a human developer before merging.
- **No AI architectural decisions**: AI MUST NOT make architectural, design pattern, or technology stack decisions without explicit human-defined specifications.
- **Constitution compliance**: AI-generated code MUST comply with every principle in this constitution. Developers are responsible for validating and enforcing compliance.
- **Developer accountability**: The developer who commits AI-generated code assumes full responsibility for its correctness, security, and maintainability. "AI wrote it" is not an acceptable justification for defects.

**Rationale**: AI is a productivity tool, not a decision-maker. Humans remain accountable for all code entering the codebase.

## Security Requirements

The following security constraints apply across all services as non-negotiable baseline:

- TLS encryption required for all external and inter-service communication.
- API keys, secrets, and credentials MUST be stored in a secrets manager or environment variables — never in source code or configuration files committed to version control.
- Rate limiting and request size limits MUST be enforced on all public-facing endpoints.
- Security headers (CORS, CSP, X-Content-Type-Options, etc.) MUST be set appropriately on HTTP endpoints.

## Development Workflow & Quality Gates

All contributions — human-written or AI-assisted — MUST pass the following gates before merging:

1. **Code review**: At least one peer review required. Reviewer MUST verify compliance with all constitution principles.
2. **Test gate**: All tests MUST pass. Coverage MUST meet or exceed 80%. Coverage reports MUST be generated in CI.
3. **Linting & formatting**: Code MUST pass all linting and formatting checks with zero warnings.
4. **Security scan**: Dependency vulnerability scans MUST pass with zero critical/high vulnerabilities.
5. **Constitution Check**: Before Phase 0 research and after Phase 1 design in the planning workflow, the implementation plan MUST be validated against this constitution. Any violations MUST be documented and justified in the plan's Complexity Tracking section.

## Governance

### Authority

This constitution supersedes all other development practices, conventions, or preferences within the forgeKit project. No principle may be bypassed without explicit amendment to this document.

### Amendment Procedure

1. Propose the amendment with clear rationale and impact analysis.
2. All stakeholders review and provide feedback.
3. Amendment is approved when all active maintainers consent.
4. Version number is updated according to semantic versioning rules below.
5. Amendment is merged and this file is updated.

### Versioning Policy

- **MAJOR**: Backward-incompatible changes — removal of a principle, redefinition of a principle's scope, or removal of a mandatory section.
- **MINOR**: Addition of a new principle, material expansion of guidance, or new mandatory section.
- **PATCH**: Clarifications, wording improvements, typo fixes, or non-semantic refinements.

### Compliance Review

Every pull request, merge, and release is implicitly a compliance review. Reviewers MUST flag any principle violations. Violations MUST be resolved before the change is merged. Persistent or systemic violations may trigger a constitution review to determine whether the principle needs refinement or the implementation approach is flawed.

**Version**: 1.0.0 | **Ratified**: 2026-04-14 | **Last Amended**: 2026-04-14
