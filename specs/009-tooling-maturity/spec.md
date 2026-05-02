# Feature Specification: Tooling Maturity (Scaffolding & Service Doctor)

**Feature Branch**: `feat/009-tooling-maturity`
**Created**: 2026-05-01
**Status**: Draft

## Project Overview

As ForgeKit evolves into a production-ready microservices starter kit, the developer experience (DX) tooling must be highly resilient and intelligent. Recent evaluations identified critical gaps in the scaffolding process and the diagnostic tools (Service Doctor). 

This specification defines the requirements for upgrading `pnpm scaffold` to true "Zero-Configuration" capability and enhancing `pnpm service:doctor` to provide actionable, self-healing diagnostics.

---

## 1. Scaffolding Maturity (Zero-Configuration)

### Current State
The `pnpm scaffold` command successfully copies the service template but lacks contextual awareness. It fails to configure necessary dependencies (like Prisma or messaging clients) and does not prepare the `Dockerfile` or `package.json` for immediate use with databases or brokers, leading to bootstrap failures.

### Target State
A new service must be 100% compatible and runnable immediately after scaffolding, without requiring manual intervention in configuration files, Dockerfiles, or database schemas.

### Functional Requirements

- **FR-001**: The scaffold command MUST prompt or accept flags for required capabilities (e.g., `--with-database`, `--with-messaging`).
- **FR-002**: If database support is requested, the scaffold MUST:
  - Generate a valid `prisma/schema.prisma` file.
  - Inject the required Prisma dependencies (`@prisma/client`, `prisma`) into the service's `package.json`.
  - Inject the `db:generate` and `db:push` scripts into `package.json`.
  - Update the service's `Dockerfile` to run `db:generate` before the build step.
- **FR-003**: If messaging support is requested, the scaffold MUST:
  - Inject the required messaging dependencies (e.g., `amqplib`, `@types/amqplib`) into the service's `package.json`.
- **FR-004**: The scaffold command MUST automatically update `scripts/bootstrap/start.js` to include the new service in the database synchronization step (`prisma db push`) if database support is enabled.
- **FR-005**: The scaffold command MUST ensure all required environment variables (`DATABASE_URL`, `RABBITMQ_URL`) are injected into the new service's block in `docker-compose.yml`.

---

## 2. Resiliência do Tooling (Service Doctor)

### Current State
The Service Doctor checks basic configurations and verifies if a container is running. However, when a container fails to start (e.g., due to a build error or startup crash), the Doctor only reports that the container is down, providing no actionable insight.

### Target State
The Service Doctor must act as an intelligent diagnostic tool capable of inspecting the environment, analyzing logs, and suggesting specific repair commands (Self-Healing CLI).

### Functional Requirements

- **FR-006**: When a service container is not found or is in an `exited` state, the Service Doctor MUST automatically query `docker logs` for that specific container.
- **FR-007**: The Service Doctor MUST parse the extracted logs to identify common failure patterns (e.g., Prisma initialization errors, missing database, missing RabbitMQ connection, syntax errors).
- **FR-008**: The Service Doctor MUST output a detailed, human-readable diagnosis of *why* the container failed to start based on the log analysis.
- **FR-009**: The Service Doctor MUST suggest actionable "Self-Healing" commands based on the diagnosis (e.g., suggesting `pnpm --filter <service> run db:generate` if a Prisma client error is detected, or `docker compose build <service>` if a build issue is suspected).
- **FR-010**: The Service Doctor SHOULD optionally offer to run the self-healing command on behalf of the user if confirmed (interactive mode).

---

## Success Criteria

- **SC-001**: A developer can run `pnpm scaffold new-service --with-database --with-messaging`, immediately run `pnpm boot`, and observe the new service starting successfully, connecting to the database and broker, and passing health checks without manual edits.
- **SC-002**: If a service crashes due to a missing database schema, running `pnpm service:doctor new-service` will explicitly identify the Prisma error from the logs and suggest the correct `db:push` command to fix it.
