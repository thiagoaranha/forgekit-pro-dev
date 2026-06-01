# Implementation Tasks: Service Scaffold Integration

**Branch**: `feat/scaffold-integration-impl`
**Source Plan**: `plan.md`

## Phase 1: Service Template Enhancements
**Goal**: Prepare the `service-template` with the necessary artifacts and boilerplate so it can be deployed into the Docker ecosystem and provide smoke-test functionality.

- [x] **Task 1.1**: Add a `Dockerfile` to `packages/service-template/` that uses a multi-stage build, builds from the monorepo root context, and includes a `HEALTHCHECK` for `/health/live` (FR-001..FR-005).
- [x] **Task 1.2**: Update `packages/service-template/src/infrastructure/config/service-config.ts` to require `DATABASE_URL` and include a default `RABBITMQ_URL`. Also prepare `PORT` to be dynamically replaced by the scaffold script (FR-018, FR-019).
- [x] **Task 1.3**: Add a synchronous example route (`GET /items`) in `packages/service-template/src/transport/http/routes/example-routes.ts` and register it (FR-022).
- [x] **Task 1.4**: Add a minimal asynchronous example (RabbitMQ publisher/consumer) in `packages/service-template/src/infrastructure/messaging/` demonstrating correlation ID propagation (FR-023).
- [x] **Task 1.5**: Update `packages/service-template/src/transport/http/register-routes.ts` to register the example routes (FR-022).

## Phase 2: Scaffold Engine Upgrades
**Goal**: Enhance the core `scripts/scaffold/index.js` script to handle validation, atomic rollbacks, and port allocation deterministically.

- [x] **Task 2.1**: Implement strict service name validation (lowercase alphanumeric and hyphens, 2-50 chars) at the start of the scaffold script (FR-027).
- [x] **Task 2.2**: Implement an atomic rollback mechanism. Track all file copies and modifications. If any error is caught during the process, restore modified files from backups and remove the created service directory (FR-028, FR-029).
- [x] **Task 2.3**: Implement the port allocation logic. Parse `infra/compose/docker-compose.yml`, extract all mapped ports, find the highest used port, and allocate the next available port. Use a regex that matches only top-level service port definitions (not `depends_on` references) (FR-010, FR-011).

## Phase 3: System Integration (Code Injection)
**Goal**: Inject the new service into the existing ForgeKit infrastructure.

- [x] **Task 3.1 [Compose Injection]**: Update `scripts/scaffold/index.js` to inject a new service block into `infra/compose/docker-compose.yml`. Ensure correct build context, port mapping, environment variables (`NODE_ENV`, `DATABASE_URL`, `RABBITMQ_URL`), and `depends_on` rules (FR-006..FR-009).
- [x] **Task 3.2 [Gateway Config Injection]**: Update `scripts/scaffold/index.js` to inject the new `<SERVICE_NAME_UPPER>_SERVICE_URL` variable into the `gateway` service block within `docker-compose.yml` (FR-017).
- [x] **Task 3.3 [Gateway Routing Injection]**: Update `scripts/scaffold/index.js` to inject the `@fastify/http-proxy` registration for `/api/<service-name>` into `apps/gateway/src/index.ts`. JWT verification, identity propagation, and correlation ID mapping are included (FR-014..FR-016).
- [x] **Task 3.4 [Template Config Modification]**: The scaffold replaces `{{SERVICE_PORT}}` in `service-config.ts` with the dynamically allocated port during the placeholder replacement pass (FR-012, FR-013).
- [x] **Task 3.5 [Bootstrap Script Injection]**: The scaffold injects a new `console.log` statement in `scripts/bootstrap/start.js` showing the new service's URL (FR-025, FR-026).

## Phase 4: Post-Scaffold Experience and Testing
**Goal**: Finalize the developer experience with clear feedback and ensure everything works end-to-end.

- [x] **Task 4.1**: Implement a post-scaffold console summary that prints created/modified files, the allocated port, the gateway proxy path, and remaining manual steps (FR-031..FR-033).
- [ ] **Task 4.2**: Test the entire flow end-to-end. Run `pnpm scaffold order-service`, run `pnpm boot`, and verify the service is reachable via `http://localhost:3000/api/order-service/health/live` (SC-001..SC-006). *Requires Docker environment.*
