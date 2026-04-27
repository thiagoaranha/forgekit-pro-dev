# Implementation Plan: Service Scaffold Integration

**Branch**: `005-scaffold-integration` | **Date**: 2026-04-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-scaffold-integration/spec.md`

## Summary

Turn spec `005` into a functional implementation by upgrading the ForgeKit scaffolding tool (`pnpm scaffold`). The goal is to evolve the scaffold from a simple directory copier into an intelligent workspace generator that automatically wires a new microservice into the local Docker Compose stack, the API Gateway proxy, and the bootstrap script, while ensuring deterministic port allocation and atomic failure handling.

## Technical Context

**Language/Version**: Node.js 22 LTS (for the scaffold script)
**Primary Dependencies**: `fs`, `path`, and standard Node.js built-ins. Avoid adding heavy AST parsing dependencies to the workspace root if simple regex/string manipulation is sufficient and robust.
**Target Files**: `scripts/scaffold/index.js`, `packages/service-template/*`, `infra/compose/docker-compose.yml`, `apps/gateway/src/index.ts`, `scripts/bootstrap/start.js`.
**Project Type**: Developer tooling and developer experience (DX) improvement.
**Performance Goals**: The scaffold command must complete in under 10 seconds.
**Constraints**: Must maintain atomicity. If a file edit fails, the file system must be reverted to its pre-scaffold state. Must not break existing services.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Clean Code & Readability**: Pass. The scaffold script must be organized into clear, focused functions for file parsing, port allocation, and AST/string manipulation.
- **Testing Standards**: Pass. Scaffold integration will be verified via end-to-end smoke testing of a newly generated service.
- **Security by Default**: Pass. The scaffold will wire environment variables correctly and proxy routes will enforce JWT verification and identity propagation via the Gateway.
- **Observability & Traceability**: Pass. Example routes will demonstrate correlation ID propagation and structured logging.
- **Microservices Architecture Boundaries**: Pass. The scaffold wires the gateway as the single entry point and isolates the service's database.

## Project Structure

### Documentation (this feature)

```text
specs/005-scaffold-integration/
|-- spec.md
|-- plan.md
`-- tasks.md
```

### Source Code (repository root)

```text
scripts/
|-- scaffold/
|   `-- index.js          <-- Core logic updates here
|-- bootstrap/
|   `-- start.js          <-- Bootstrap console output updates

packages/
`-- service-template/     <-- Dockerfile and example routes added here

apps/
`-- gateway/
    `-- src/
        `-- index.ts      <-- Proxy injection target

infra/
`-- compose/
    `-- docker-compose.yml <-- Compose injection target
```

## Phase 1 Design

### Delivery Slice

The planning slice for spec `005` will define:
1. **Template Enhancements**: Adding a `Dockerfile`, updating `service-config.ts` for database/messaging URLs, and adding minimal sync/async example routes to `packages/service-template`.
2. **Deterministic Port Allocation**: A robust parser in `scripts/scaffold/index.js` that scans `docker-compose.yml` for existing ports and allocates the next available port >= 3001.
3. **Integration Injectors**: String/Regex or lightweight AST based injectors that safely insert code blocks into YAML and TypeScript files without breaking formatting.
4. **Atomic Rollback**: A transaction-like wrapper around the scaffold process that tracks modified files and restores backups if an exception occurs.
5. **Post-Scaffold Summary**: A user-friendly console output that summarizes what was wired and what manual steps remain.

### Implementation Strategy

1. **Phase 1: Template Preparation**
   - Add `Dockerfile` to the template.
   - Add example HTTP routes and RabbitMQ messaging boilerplate.
   - Update configuration schema with `DATABASE_URL` and `RABBITMQ_URL`.

2. **Phase 2: Scaffold Engine Upgrades**
   - Implement service name validation.
   - Implement the atomic rollback mechanism.
   - Implement the port allocation logic by parsing the compose file.

3. **Phase 3: Code Injection implementation**
   - **Compose**: Inject the new service block, database URL, and update gateway's environment variables.
   - **Gateway**: Inject the `@fastify/http-proxy` registration in `index.ts`.
   - **Bootstrap**: Update the `console.log` statements in `start.js`.

4. **Phase 4: Validation and Rollout**
   - Run end-to-end tests by scaffolding a service and running `pnpm boot`.

## Planned Artifacts

- `specs/005-scaffold-integration/tasks.md`: Execution tasks generated from this plan.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
