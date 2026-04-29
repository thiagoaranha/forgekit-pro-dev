# Specification: 007-service-doctor

## 1. Overview
The **Service Doctor** is an automated smoke-testing CLI tool designed to validate the health, connectivity, and configuration of any given ForgeKit service. When a developer scaffolds or modifies a service, they need a fast, reliable way to answer: *"Is this service working end-to-end?"*

This specification defines the `pnpm service:doctor <service>` command, which performs a series of checks (container status, health endpoints, gateway routing, synchronous, and asynchronous communication) and provides actionable correction messages if any check fails.

## 2. User Stories

### User Story 1 - E2E Verification
As a developer, I want to run a single command (`pnpm service:doctor <service>`) after scaffolding or modifying a service, so that I can automatically verify that the container is running, the gateway is routing correctly, and all example endpoints (sync and async) are functioning.

### User Story 2 - Actionable Troubleshooting
As a developer, when my service is not working properly, I want the doctor tool to tell me exactly *what* is broken (e.g., missing environment variable, dead container, gateway misconfiguration) and *how* to fix it, so I don't waste time debugging boilerplate infrastructure.

## 3. Functional Requirements

### FR-001: Command Interface
The tool MUST be executable via `pnpm service:doctor <service>` from the monorepo root.

### FR-002: Configuration & Registration Check
The tool MUST verify that the service is correctly registered in `infra/compose/docker-compose.yml` and that required environment variables (`DATABASE_URL`, `RABBITMQ_URL`) are present in its environment.

### FR-003: Container Status Check
The tool MUST verify that the Docker container for the specified service is currently running. If it is not running, it MUST emit a clear correction message (e.g., "Container is not running. Run 'pnpm boot' to start the stack").

### FR-004: Gateway Routing Check
The tool MUST verify that a route for `/api/<service>/*` is registered in the API Gateway.

### FR-005: Health Endpoint Validation
The tool MUST perform an HTTP GET request to the service's health endpoint via the gateway (`http://localhost:3000/api/<service>/health/live`) and expect a 200 OK status.

### FR-006: Synchronous Flow Validation
The tool MUST perform an HTTP GET request to the synchronous example endpoint (`http://localhost:3000/api/<service>/items`) and verify that it returns a successful response, proving the end-to-end request/response cycle.

### FR-007: Asynchronous Flow Validation
The tool MUST validate the publish/consume functionality. It SHOULD do this by invoking a mechanism that triggers a message publish, and then verifying that the consumer successfully received and processed the message (e.g., by inspecting the container logs for a specific correlation ID or message signature).

### FR-008: Actionable Output
For every failed check, the tool MUST emit a clear, human-readable correction message explaining what went wrong and suggesting a concrete next step.

## 4. Acceptance Scenarios

### SC-001: Fully Functional Service
**Given** a newly scaffolded service that is running via `pnpm boot`, **When** the developer runs `pnpm service:doctor <service>`, **Then** all checks pass successfully, and the tool exits with code 0 and a green success message.

### SC-002: Container Down
**Given** a service whose container has been stopped, **When** the developer runs `pnpm service:doctor <service>`, **Then** the Container Status Check fails, the tool suggests running `pnpm boot`, and exits with code 1.

### SC-003: Gateway Misconfiguration
**Given** a service where the proxy registration is missing from the gateway, **When** the developer runs `pnpm service:doctor <service>`, **Then** the Gateway Routing Check fails, suggesting the developer check `apps/gateway/src/index.ts`.

### SC-004: Async Messaging Failure
**Given** a service where RabbitMQ is unreachable or the consumer is broken, **When** the developer runs `pnpm service:doctor <service>`, **Then** the Asynchronous Flow Validation fails, providing logs or hints regarding the RabbitMQ connection.

## 5. Non-Goals
- Replacing unit tests (Jest/Vitest).
- Replacing integration tests for specific domain logic.
- Benchmarking or load testing the service.
