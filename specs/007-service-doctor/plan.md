# Implementation Plan: Service Doctor

**Branch**: `feat/007-service-doctor-spec` | **Spec**: [spec.md](./spec.md)

## Summary
The goal is to build `scripts/doctor/index.js`, a Node.js CLI tool that performs a sequence of diagnostic checks on a target service. It will act as an end-to-end smoke test, validating both static configuration and dynamic runtime behavior.

## Technical Context
- **Tooling**: Node.js, `child_process` (for interacting with Docker), standard `http`/`fetch` API.
- **Target**: A specific service running within the ForgeKit Docker stack.
- **Dependencies**: No external dependencies required. We will use native Node.js tools and the `docker` CLI.

## Implementation Strategy

### 1. Static Checks (Pre-Flight)
Before hitting the network, the script will:
- Parse `infra/compose/docker-compose.yml` to verify the service exists.
- Parse `apps/gateway/src/index.ts` to ensure the proxy route is registered.

### 2. Runtime Checks (Docker)
Using `child_process.execSync`:
- Run `docker ps --filter "name=<service>" --format "{{.Status}}"` to verify the container is running and healthy.

### 3. Network Checks (HTTP)
Using native `fetch`:
- Call `http://localhost:3000/api/<service>/health/live` to check the service health.
- Call `http://localhost:3000/api/<service>/items` to check the synchronous flow.

### 4. Asynchronous Checks (Messaging)
To validate RabbitMQ publish/consume:
- We will trigger the example async flow. The service template currently has an example route or startup script that publishes a message. If the route `/api/<service>/items` triggers a message publish, we can tail the docker logs.
- Wait briefly, then execute `docker logs <container-name> --tail 50`.
- Search the logs for the expected correlation ID or success message indicating the consumer processed the event.

### 5. Output Formatting
The script will output a step-by-step checklist to the console.
- ✅ Pass
- ❌ Fail -> Suggestion (e.g., "Run pnpm boot")

## Complexity Tracking
- **Docker Dependency**: The script relies on the local Docker daemon being accessible via the `docker` CLI.
- **Timing**: Async messaging validation might require a slight delay (e.g., `setTimeout` for 1-2 seconds) to allow the consumer to process and log the message before we read the docker logs.
