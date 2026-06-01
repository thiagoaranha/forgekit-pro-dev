# Implementation Tasks: ForgeKit System Overview

**Branch**: `feat/001-forgekit-overview`
**Source Plan**: `plan.md`

## Phase 0: Initialization & Research
- [x] **Task 0.1**: Create `research.md` to document final choices on Docker Compose structure, Auth baseline (JWT), scaffolding strategy, and CI integration components.
- [x] **Task 0.2**: Scaffold the monorepo root structure (`apps/`, `packages/`, `infra/`, `scripts/`, `docs/`, `.github/workflows/`) and initialize the `pnpm` workspace (`pnpm-workspace.yaml`).
- [x] **Task 0.3**: Configure baseline TypeScript (`tsconfig.base.json`) and code quality tooling (ESLint/Prettier) rules across the workspace.

## Phase 1: Shared Primitives
- [x] **Task 1.1**: Create `packages/shared-observability` providing Pino logger setup (structured logging) and correlation ID propagation utilities.
- [x] **Task 1.2**: Create `packages/shared-testing` providing Vitest configurations and Testcontainers boilerplate.
- [x] **Task 1.3**: Create `packages/shared-tooling` with basic Zod configuration and environment-aware contract parsing tools.

## Phase 2: Gateway & Example Service implementation
- [x] **Task 2.1**: Implement `apps/gateway` using Fastify. Establish reverse routing logic and add a JWT development token validation plugin.
- [x] **Task 2.2**: Setup `apps/services/example-service` with Fastify + Prisma (PostgreSQL). Define a baseline data schema in Prisma and create at least one demonstrable resource endpoint (e.g., `POST /items`, `GET /items`).
- [x] **Task 2.3**: Implement generic Healthcheck endpoints (`/health/live`, `/health/ready`) in both services.
- [x] **Task 2.4**: Implement graceful shutdown logic ensuring open requests finish properly.

## Phase 3: Infrastructure & Orchestration
- [x] **Task 3.1**: Create `infra/compose/docker-compose.yml` provisioning local PostgreSQL and RabbitMQ instances.
- [x] **Task 3.2**: Add the API Gateway and Example Service `Dockerfile`s and integrate them into the `docker-compose.yml` for unified local orchestration.
- [x] **Task 3.3**: Create `scripts/bootstrap/start.sh` (or a cross-platform Node script) to spin up infrastructure and services securely and assert they report as *healthy*.

## Phase 4: Scaffolding System
- [x] **Task 4.1**: Create `packages/service-template`, containing the golden service skeleton (fully integrated with `shared-observability` and `shared-testing`, matching a strict domain architecture).
- [x] **Task 4.2**: Implement `scripts/scaffold/index.js` which clones the template, injects the new `service-name`, and automatically registers it inside the API Gateway routes and `docker-compose.yml`.

## Phase 5: CI & Delivery
- [x] **Task 5.1**: Draft `.github/workflows/ci.yml` pipeline validating TS compilation, enforcing 80% test coverage via Vitest, and executing dependency checks.
- [x] **Task 5.2**: Write `quickstart.md`, `data-model.md`, and generate `contracts/` inside `specs/001-forgekit-overview/` to guide platform engineers on booting up.
- [x] **Task 5.3**: Final Quality Assurance. Run the full local test: bootstrap the cluster, execute the token-gated request across the gateway to the `example-service`, and generate a dummy service using the scaffolding CLI to prove the integration works.
