# Feature Specification: Service Scaffold Integration

**Feature Branch**: `005-scaffold-integration`
**Created**: 2026-04-27
**Status**: Draft
**Input**: User description: "Make the scaffold command generate a service that is truly integrated into the ForgeKit ecosystem — registered in Docker Compose, routed through the gateway, configured with correct ports and environment variables, and runnable from `pnpm boot` without manual steps."

## Integration Problem Overview

The current scaffold command (`pnpm scaffold <service-name>`) copies the service template into `apps/services/<service-name>` and replaces the `{{SERVICE_NAME}}` placeholder, but it does not integrate the new service into the runtime ecosystem.

After running the scaffold today, a developer believes the service is ready, but it is not. The following critical integration steps remain invisible and undocumented:

- The new service has no Dockerfile, so it cannot participate in the Docker Compose stack.
- The new service is not registered in `infra/compose/docker-compose.yml`, so `pnpm boot` does not start it.
- The API Gateway has no proxy route for the new service, so it is unreachable through the gateway.
- The gateway has no `*_SERVICE_URL` environment variable pointing to the new service, so even a manually added proxy would have no upstream target.
- The service template defaults `PORT` to `3000`, which conflicts with the gateway port, and provides no `RABBITMQ_URL` or `DATABASE_URL` defaults for the Docker network.
- The bootstrap script output does not mention the new service, so the developer has no visual confirmation that it is part of the stack.

The result is that every new service requires the developer to discover and manually perform five or more cross-file edits before the service can be started, reached, or tested. If any single edit is missing, the service fails silently or the logs are ambiguous, leading to time-consuming debugging of configuration and wiring rather than domain work.

This specification defines the requirements for the scaffold command to produce a service that is fully wired into the ForgeKit local development environment from the moment of creation.

## Relationship to Existing Specifications

This specification is subordinate to and aligned with:

- **Spec 001 (ForgeKit Overview)**: FR-002 explicitly requires that the scaffolding command automatically integrates the new service into local orchestration, gateway routing, and CI discovery. SC-005 requires the service to be reachable through the gateway after restart without manual edits. This specification delivers the implementation requirements to satisfy those commitments.
- **Spec 002 (Architecture Reference)**: Defines the gateway as the single entry point (FR-030), proxy routing behavior (FR-031, FR-032), identity propagation (FR-035–FR-038), and correlation ID propagation (FR-041). Scaffold integration MUST generate wiring that conforms to these rules.
- **Spec 003 (Service Standards)**: Defines the mandatory service structure, health endpoints (FR-051, FR-052, FR-068), configuration validation (FR-014, FR-015), and observability requirements (FR-019–FR-022). The template already satisfies most of these; this specification addresses the gaps that prevent the scaffolded service from being operationally reachable.
- **Spec 004 (Version Control)**: Scaffold-generated changes MUST be committed following the Conventional Commits standard.

If this specification conflicts with the constitution, the constitution takes precedence. If this specification conflicts with spec 001, 002, or 003, those specifications take precedence.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scaffold a Fully Integrated Service (Priority: P1)

A developer needs to add a new microservice to the ForgeKit system. They run a single scaffold command and, after restarting the local bootstrap, the new service is running inside Docker Compose, reachable through the API Gateway, and visible in the bootstrap output — without editing any file manually.

**Why this priority**: This is the primary value proposition. If the scaffold command produces a service that cannot be started, reached, or tested without manual cross-file edits, the developer experience promise of ForgeKit is broken and the scaffold is functionally incomplete.

**Independent Test**: A developer can run `pnpm scaffold my-service`, then run `pnpm boot`, and confirm that the new service responds to health checks both directly and through the gateway proxy at `/api/my-service/health/live`.

**Acceptance Scenarios**:

1. **Given** a developer running `pnpm scaffold order-service`, **When** the command completes, **Then** the following artifacts exist: a Dockerfile at `apps/services/order-service/Dockerfile`, a service block in `infra/compose/docker-compose.yml` with correct build context, port mapping, environment variables, and `depends_on` entries, and a proxy registration in `apps/gateway/src/index.ts` with the upstream URL from an environment variable.
2. **Given** a newly scaffolded service, **When** the developer runs `pnpm boot`, **Then** the new service starts inside Docker Compose, passes health checks, and is listed in the bootstrap output alongside existing services.
3. **Given** a newly scaffolded service running behind the gateway, **When** the developer requests `GET /api/<service-name>/health/live` through the gateway with a valid dev token, **Then** the gateway proxies the request and returns `{ "status": "OK" }`.
4. **Given** a newly scaffolded service, **When** a reviewer inspects the generated Dockerfile, **Then** it follows the same multi-stage build pattern used by existing services, builds from the monorepo root context, and produces a production-ready image.

---

### User Story 2 - Scaffold Generates Correct Configuration and Port Assignment (Priority: P2)

A developer needs the scaffolded service to start on a port that does not conflict with existing services and to have environment variable defaults that work correctly inside the Docker network and for local development outside Docker.

**Why this priority**: Port conflicts and misconfigured URLs are the most common silent failures after scaffolding. A service that starts but listens on the same port as the gateway or another service wastes developer time debugging network errors rather than building domain logic.

**Independent Test**: A developer can scaffold two new services sequentially and both start successfully inside Docker Compose without port conflicts. Each service's configuration schema includes correct defaults for `PORT`, `HOST`, `DATABASE_URL`, and `RABBITMQ_URL`.

**Acceptance Scenarios**:

1. **Given** a scaffold command, **When** it generates the service configuration, **Then** the `PORT` default in the Zod config schema is set to the allocated port (not `3000`), and the Docker Compose port mapping matches.
2. **Given** a scaffold command, **When** it generates the Docker Compose entry, **Then** the environment includes `DATABASE_URL` pointing to the shared PostgreSQL instance with a service-specific database name, and `RABBITMQ_URL` pointing to the shared RabbitMQ instance.
3. **Given** a scaffold command, **When** it generates the gateway environment, **Then** a new `<SERVICE_NAME_UPPER>_SERVICE_URL` variable is added to the gateway's Docker Compose environment pointing to the new service's internal Docker network address and port.
4. **Given** the scaffold has allocated a port, **When** the developer inspects the Docker Compose file, **Then** the port does not conflict with any existing service, the gateway (3000), PostgreSQL (5432), or RabbitMQ (5672/15672).

---

### User Story 3 - Scaffold Generates Smoke-Test Routes (Priority: P3)

A developer needs the scaffolded service to include minimal working example routes — one synchronous and one asynchronous — so they can immediately verify that the service processes requests, emits events, and consumes events with correlation ID propagation, before writing any domain logic.

**Why this priority**: Without working example routes, the developer cannot distinguish between "the service is wired correctly but has no routes" and "the service is broken". A minimal smoke-test route confirms that the full request path (gateway → service → response) and event path (publish → consume → log) work end-to-end.

**Independent Test**: A developer can scaffold a service, start the stack, and perform a `POST` to the sync example route through the gateway to get a response, and observe the async event being published and consumed in structured logs with matching correlation IDs.

**Acceptance Scenarios**:

1. **Given** a newly scaffolded service, **When** the developer inspects the transport layer, **Then** there is a `GET /items` example route that returns a static response demonstrating the request/response flow through the gateway.
2. **Given** a newly scaffolded service, **When** the developer inspects the infrastructure layer, **Then** there is a minimal RabbitMQ publisher and consumer wired to an example exchange and queue using the service name as a namespace.
3. **Given** the async example is running, **When** the developer triggers a publish, **Then** the consumer processes the message and logs it with the propagated correlation ID.
4. **Given** a developer reviewing the example routes, **When** they inspect the code, **Then** comments clearly indicate that these are scaffolding examples meant to be replaced with domain-specific logic.

---

### Edge Cases

- What happens when a developer scaffolds a service with a name that contains characters invalid for Docker service names, database names, or environment variable names?
- What happens when the `infra/compose/docker-compose.yml` file has been manually modified with custom formatting, comments, or non-standard structure that the scaffold parser does not expect?
- What happens when the gateway `index.ts` has been restructured or extended beyond the template pattern, making automated proxy injection unreliable?
- What happens when all ports in the expected allocation range are already occupied by existing services?
- How does the scaffold handle a service name that is a substring of an existing service name (e.g., `order` when `order-service` exists)?
- What happens when the scaffold is run but `pnpm install` has not been executed, or `node_modules` is missing?
- What happens when the scaffold modifies `docker-compose.yml` and `gateway/index.ts` but the operation fails midway — are partial modifications rolled back?

## Requirements *(mandatory)*

### Functional Requirements

#### Dockerfile Generation

- **FR-001**: The scaffold command MUST generate a Dockerfile at `apps/services/<service-name>/Dockerfile` for every new service.
- **FR-002**: The generated Dockerfile MUST use a multi-stage build pattern consistent with existing service Dockerfiles in the repository.
- **FR-003**: The generated Dockerfile MUST use the monorepo root as the build context and MUST copy only the files required for the specific service and its workspace dependencies.
- **FR-004**: The generated Dockerfile MUST produce a production-ready image that starts the service using the compiled output (e.g., `node dist/index.js`).
- **FR-005**: The generated Dockerfile MUST include a `HEALTHCHECK` instruction that probes the service's `/health/live` endpoint.

#### Docker Compose Registration

- **FR-006**: The scaffold command MUST register the new service in `infra/compose/docker-compose.yml` as a new service block.
- **FR-007**: The Docker Compose service block MUST include: `build` with correct context and dockerfile path, `ports` mapping the allocated port, `environment` with `NODE_ENV`, `DATABASE_URL`, and `RABBITMQ_URL`, `depends_on` with `postgres` and `rabbitmq` (using `condition: service_healthy`), and `networks` with `forgekit-net`.
- **FR-008**: The scaffold command MUST add the new service's `DATABASE_URL` environment variable pointing to a service-specific database on the shared PostgreSQL instance (e.g., `<service_name>_db`).
- **FR-009**: The scaffold command MUST add the new service's `RABBITMQ_URL` environment variable pointing to the shared RabbitMQ instance using the Docker network hostname.

#### Port Allocation

- **FR-010**: The scaffold command MUST allocate a unique port for the new service that does not conflict with any port already defined in `infra/compose/docker-compose.yml`.
- **FR-011**: Port allocation MUST follow a deterministic strategy: the scaffold MUST scan the existing Docker Compose file for all mapped host ports and assign the next available port starting from `3001` in ascending order.
- **FR-012**: The allocated port MUST be set as the default value in the service's Zod configuration schema (`service-config.ts`), replacing the template default of `3000`.
- **FR-013**: The allocated port MUST be used consistently in the Docker Compose port mapping, the gateway upstream URL, and the bootstrap output.

#### Gateway Proxy Registration

- **FR-014**: The scaffold command MUST register a new proxy route in the API Gateway source code (`apps/gateway/src/index.ts`) that forwards requests from `/api/<service-name>/*` to the new service.
- **FR-015**: The proxy registration MUST follow the same pattern as the existing `example-service` proxy: it MUST include a `preHandler` that verifies the JWT, injects identity headers (`x-forgekit-user-id`, `x-forgekit-role`), and propagates the correlation ID (`x-correlation-id`).
- **FR-016**: The proxy upstream URL MUST be read from an environment variable named `<SERVICE_NAME_UPPER>_SERVICE_URL` (e.g., `ORDER_SERVICE_SERVICE_URL` for a service named `order-service`), with a localhost fallback for local development outside Docker.
- **FR-017**: The scaffold command MUST add the `<SERVICE_NAME_UPPER>_SERVICE_URL` environment variable to the gateway's service block in `infra/compose/docker-compose.yml`, pointing to the new service's Docker network address and allocated port.

#### Service Configuration

- **FR-018**: The scaffold command MUST generate a `service-config.ts` with a Zod schema that includes at minimum: `PORT` (defaulting to the allocated port), `HOST` (defaulting to `0.0.0.0`), `DATABASE_URL` (string, required), and `RABBITMQ_URL` (string, with a default pointing to the local RabbitMQ instance).
- **FR-019**: The generated configuration MUST validate all required variables at startup and MUST fail fast with a descriptive error message when any required variable is missing or invalid, consistent with spec 003 FR-015.

#### Health Endpoints

- **FR-020**: The scaffolded service MUST expose `/health/live` and `/health/ready` endpoints. This requirement is already satisfied by the existing service template and MUST NOT be regressed by scaffold integration changes.
- **FR-021**: The `/health/ready` endpoint MUST include a readiness check for the database connection and SHOULD include a readiness check for the RabbitMQ connection when async messaging is wired.

#### Example Routes

- **FR-022**: The scaffolded service MUST include a synchronous example route (`GET /items`) in the transport layer that returns a static response, demonstrating the full request path from gateway through the service.
- **FR-023**: The scaffolded service SHOULD include an asynchronous example consisting of a minimal RabbitMQ publisher and consumer, wired to a service-namespaced exchange and queue, that demonstrates event publishing, consumption, and correlation ID propagation.
- **FR-024**: All example routes and messaging code MUST include clear code comments indicating that they are scaffolding examples intended to be replaced with domain-specific implementations.

#### Bootstrap Script Integration

- **FR-025**: The scaffold command SHOULD update the bootstrap script (`scripts/bootstrap/start.js`) to include the new service in the final output listing, showing the service name and its accessible URL.
- **FR-026**: If the bootstrap script update cannot be performed safely by automated modification, the scaffold command MUST print a clear instruction to the developer explaining how to add the service to the bootstrap output manually.

#### Scaffold Safety and Atomicity

- **FR-027**: The scaffold command MUST validate the service name against naming rules before performing any file operations. Valid service names MUST consist of lowercase alphanumeric characters and hyphens only, MUST NOT start or end with a hyphen, and MUST be between 2 and 50 characters long.
- **FR-028**: The scaffold command MUST perform all file operations atomically: if any step fails (template copy, Dockerfile generation, Docker Compose modification, gateway modification), all changes MUST be rolled back and the repository MUST be left in its original state.
- **FR-029**: The scaffold command MUST NOT modify files outside of: the new service directory (`apps/services/<service-name>/`), the Docker Compose file (`infra/compose/docker-compose.yml`), the gateway source (`apps/gateway/src/index.ts`), and optionally the bootstrap script (`scripts/bootstrap/start.js`).
- **FR-030**: The scaffold command MUST refuse to run if the target service directory already exists, consistent with the current behavior.

#### Post-Scaffold Verification

- **FR-031**: After successful scaffolding, the command MUST print a summary of all changes made, including: files created, files modified, allocated port, gateway proxy path, and Docker Compose service name.
- **FR-032**: After successful scaffolding, the command MUST print a concise checklist of any remaining manual steps (e.g., running `pnpm install`, creating the service-specific database if not using the shared instance, or configuring domain-specific authorization rules).
- **FR-033**: The scaffold command SHOULD run a post-scaffold structural validation that confirms: the generated Dockerfile exists and references the correct service path, the Docker Compose file parses correctly with the new service block, and the gateway source file contains the new proxy registration.

### Out of Scope

- **OS-001**: Production environment configuration, deployment provisioning, and external infrastructure setup are out of scope for the scaffold command, consistent with spec 001 assumptions.
- **OS-002**: Domain-specific authorization and authentication rules beyond the standard JWT verification and identity header propagation are out of scope.
- **OS-003**: Domain-specific payload contracts, business logic schemas, and advanced validation beyond the example route structure are out of scope.
- **OS-004**: Advanced messaging topology (Dead Letter Queues, retry policies, partitioning, complex exchange routing) is out of scope. The scaffold provides a minimal pub/sub example only.
- **OS-005**: External dependency integration (S3, Redis, third-party APIs) is out of scope.
- **OS-006**: CI/CD workflow modifications are out of scope. CI discovery MUST work through convention-based workspace detection as defined in spec 001.

### Key Entities

- **Scaffold Command**: The `pnpm scaffold <service-name>` command that generates a new service and integrates it into the local development environment.
- **Service Directory**: The generated directory at `apps/services/<service-name>/` containing all service source code, configuration, tests, and Dockerfile.
- **Docker Compose Registration**: The service block added to `infra/compose/docker-compose.yml` that enables the service to participate in the local Docker stack.
- **Gateway Proxy Registration**: The `@fastify/http-proxy` registration added to the API Gateway that routes `/api/<service-name>/*` to the new service with JWT verification and identity propagation.
- **Port Allocation**: The deterministic process of scanning existing port mappings and assigning the next available port to avoid conflicts.
- **Service Configuration Schema**: The Zod-validated configuration contract in `service-config.ts` that defines all runtime environment variables with correct defaults for Docker and local development.
- **Post-Scaffold Summary**: The structured output printed after scaffolding that lists all created and modified files, the allocated port, and any remaining manual steps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can run `pnpm scaffold <service-name>` followed by `pnpm boot` and reach the new service's health endpoint through the API Gateway (`/api/<service-name>/health/live`) without editing any file manually.
- **SC-002**: A developer can scaffold two services sequentially and both services start successfully in Docker Compose without port conflicts, gateway routing conflicts, or environment variable collisions.
- **SC-003**: The scaffold command completes in under 10 seconds (excluding `pnpm install`) and prints a clear summary of all created files, modified files, allocated port, and remaining manual steps.
- **SC-004**: A reviewer can inspect the scaffold output (Dockerfile, Docker Compose block, gateway proxy, configuration schema) and confirm compliance with specs 002 and 003 within 10 minutes.
- **SC-005**: If the scaffold command fails at any step, no partial modifications remain in the repository — the file system is left in the same state as before the command was run.
- **SC-006**: The generated example sync route is callable through the gateway with a valid dev token, and the generated example async route (if included) demonstrates publish/consume with correlation ID propagation visible in structured logs.

## Assumptions

- The monorepo uses `pnpm` workspaces and the scaffold command is invoked from the repository root via `pnpm scaffold <service-name>`.
- The `infra/compose/docker-compose.yml` file follows a predictable YAML structure that can be safely modified programmatically. If custom manual modifications break the parser, the scaffold will abort with a clear error.
- The API Gateway source (`apps/gateway/src/index.ts`) follows the current pattern of registering `@fastify/http-proxy` plugins inline. If the gateway has been restructured to use a dynamic plugin loader or external route configuration, this specification's approach to gateway modification MUST be revisited.
- All services share a single PostgreSQL instance and a single RabbitMQ instance in the local development environment. Each service gets its own database on the shared PostgreSQL instance.
- Port allocation starts at `3001` and increments. The gateway is fixed at port `3000`. Infrastructure services (PostgreSQL, RabbitMQ) use their standard ports. The available port range for application services is `3001–3099`.
- The existing service template already provides health endpoints, layered architecture, correlation ID propagation, structured logging, graceful shutdown, and Zod-based config validation. This specification extends the scaffold to wire those existing capabilities into the runtime ecosystem rather than reimplementing them.
- The scaffold command is a local development tool. It does not perform remote operations, infrastructure provisioning, or production deployments.
