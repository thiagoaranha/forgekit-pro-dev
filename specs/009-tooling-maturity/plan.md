# Implementation Plan: Tooling Maturity (Scaffolding & Service Doctor)

**Feature Branch**: `feat/009-tooling-maturity`
**Target Status**: Implementation Phase

## 1. Overview

This plan details the technical steps required to implement the requirements defined in `spec.md`. The focus is on making the scaffolding script (`scripts/scaffold/index.js`) context-aware and upgrading the Service Doctor (`scripts/doctor/index.js`) to include self-healing and log-analysis capabilities.

---

## 2. Phase 1: Scaffolding "Zero-Configuration" Maturity

**Objective**: Ensure `pnpm scaffold` can generate fully operational services with database and messaging configurations.

### Task 1.1: Argument Parsing and Context
- **File**: `scripts/scaffold/index.js`
- **Action**: Add parsing for optional flags: `--with-database` and `--with-messaging`.

### Task 1.2: Package.json and Scripts Injection
- **File**: `scripts/scaffold/index.js`
- **Action**: After copying the template, dynamically modify the newly created service's `package.json`:
  - If `--with-database`: Add `@prisma/client`, `prisma`, and scripts (`db:generate`, `db:push`).
  - If `--with-messaging`: Add `amqplib`, `@types/amqplib`.

### Task 1.3: Prisma Schema Generation
- **File**: `scripts/scaffold/index.js`
- **Action**: If `--with-database` is provided, create the `prisma/` directory and generate a basic `schema.prisma` file referencing the `DATABASE_URL`.

### Task 1.4: Dockerfile Adjustments
- **File**: `scripts/scaffold/index.js`
- **Action**: If `--with-database` is active, insert `RUN pnpm --filter <service_name> run db:generate` before the build step in the newly copied `Dockerfile`.

### Task 1.5: Docker Compose Orchestration
- **File**: `scripts/scaffold/index.js` (and `infra/compose/docker-compose.yml` parsing)
- **Action**: 
  - Ensure the new service block in `docker-compose.yml` injects `DATABASE_URL` and `RABBITMQ_URL` dynamically based on flags.
  - Set the appropriate `depends_on` rules (`postgres` and `rabbitmq`).

### Task 1.6: Bootstrap Sync Integration
- **File**: `scripts/scaffold/index.js`
- **Action**: Automate the injection of a new `runCompose` line for `prisma db push` inside `scripts/bootstrap/start.js` when a database-enabled service is scaffolded.

---

## 3. Phase 2: Service Doctor Resilience & Self-Healing

**Objective**: Upgrade `pnpm service:doctor` to analyze failures and suggest or execute fixes.

### Task 2.1: Container State Detection
- **File**: `scripts/doctor/index.js`
- **Action**: Improve the container status check. Identify not just if it's missing, but if it has `Exited` or is `Restarting`.

### Task 2.2: Log Extraction
- **File**: `scripts/doctor/index.js`
- **Action**: If the container is down or exited, execute `docker logs compose-<service_name>-1` programmatically to fetch the last 50-100 lines of logs.

### Task 2.3: Pattern Matching Engine
- **File**: `scripts/doctor/index.js`
- **Action**: Implement an error pattern matcher over the extracted logs:
  - **Pattern 1**: `PrismaClientInitializationError` / `Database does not exist` -> *Diagnosis: Missing DB Schema*.
  - **Pattern 2**: `ECONNREFUSED` / RabbitMQ connection failures -> *Diagnosis: Broker unavailable or misconfigured*.
  - **Pattern 3**: `Cannot find module` / `tsc` exit code 2 -> *Diagnosis: Build or dependency issue*.

### Task 2.4: Self-Healing Suggestions
- **File**: `scripts/doctor/index.js`
- **Action**: Output a clear diagnosis and the specific command to resolve it.
  - Example: *💡 FIX: Run `pnpm --filter <service> run db:push` to create the schema.*

### Task 2.5: Interactive Execution (Optional Enhancement)
- **File**: `scripts/doctor/index.js`
- **Action**: Prompt the user (e.g., using `readline`) to automatically run the suggested self-healing command.

---

## 4. Testing Strategy

1. **Scaffold Testing**: Run `pnpm scaffold test-service-full --with-database --with-messaging`. Validate that `package.json`, `Dockerfile`, `schema.prisma`, and `docker-compose.yml` are perfectly formed.
2. **Boot Testing**: Run `pnpm boot` and ensure the new `test-service-full` starts and connects without manual interventions.
3. **Doctor Testing (Failure Simulation)**:
   - Scaffold a database service but manually skip `db:push`.
   - Run `pnpm boot` (it will fail).
   - Run `pnpm service:doctor <service>`.
   - Verify that the Doctor correctly identifies the Prisma error and suggests the fix.

---

## 5. Deployment

Once testing is verified, commit changes to `feat/009-tooling-maturity` following Conventional Commits, update the main documentation (e.g., `README.md` tooling section), and prepare for merging into `master`.
