# ForgeKit Agent Notes

> **What is this file?** This is the primary context file for AI agents working in this monorepo. It is loaded first by any AI assistant and serves as the entry point to the `.ai/` governance structure. For developer-facing documentation, see [`docs/ai-agent-structure.md`](docs/ai-agent-structure.md).

## Runtime + Workspace Facts
- Monorepo uses `pnpm` workspaces (`apps/**`, `packages/*`) with Node `>=22` and pnpm `>=9`.
- The root `package.json` pins `packageManager: "pnpm@11.2.2"`, but CI currently installs `pnpm@10` — this mismatch may cause lockfile compatibility issues.
- Refer to the root `README.md` for high-level setup and commands. Rely on executable sources (`package.json`, workflow, scripts) over `specs/` prose when they differ.
- CI targets `main` and runs: `pnpm install --frozen-lockfile` -> `pnpm run lint` -> `pnpm run db:generate` -> `pnpm run build` (tests are commented out in CI).

## High-Value Commands (from repo scripts)
- Full local stack (Docker + db sync + health wait): `pnpm boot` (cross-platform Node script at `scripts/bootstrap/start.js`).
- Stop local stack: `pnpm down`.
- Run all workspace dev/build/lint/test scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`.
- Format repo files: `pnpm format`.
- Prisma helpers are recursive from root: `pnpm db:push`, `pnpm db:generate`.
- Diagnose service issues: `pnpm service:doctor <service-name>` (log analysis, failure recognition, self-healing suggestions).
- Validate a spec document: `pnpm validate-spec <spec-path>`.

## Focused Commands You Will Need
- Gateway only: `pnpm --filter gateway dev` (or `build` / `start`).
- Example service only: `pnpm --filter example-service dev`.
- Example service Prisma: `pnpm --filter example-service db:generate` and `pnpm --filter example-service db:push`.
- Scaffold a new service from template: `pnpm scaffold <service-name>`.

## Architecture Reality (current code)
- Entry services: `apps/gateway` (port `3000`) and `apps/services/example-service` (port `3001`).
- Gateway issues dev JWT at `GET /auth/dev-token` (non-production only), verifies JWT on `/api/example/*`, and forwards:
  - Identity headers: `x-forgekit-user-id` (from `user.sub`), `x-forgekit-role` (from `user.role`).
  - Observability headers: `x-correlation-id`, `traceparent` (via `injectObservabilityHeaders()`).
- Example service exposes health endpoints and `/items` CRUD-ish endpoints backed by Prisma/PostgreSQL.
- Shared libs used by services (all under `@forgekit/` npm scope):
  - `packages/shared-observability`: Pino structured logger, correlation ID + traceparent propagation, OpenTelemetry tracing, Prometheus metrics (`/metrics`), health plugin (`/health/live`, `/health/ready`).
  - `packages/shared-tooling`: env parsing helper using Zod.
  - `packages/shared-testing`: Testcontainers helper (not yet wired into CI tests).
  - `packages/shared-error-handling`: Shared error types and handlers.
  - `packages/shared-messaging`: Event/message bus abstractions.
  - `packages/shared-security`: Auth/JWT utilities.
  - `packages/service-template`: Canonical template for new services (excluded from pnpm workspace via `pnpm-workspace.yaml`).

## Gotchas Likely To Waste Time
- `scripts/scaffold/index.js` only copies `packages/service-template` into `apps/services/<name>` and replaces `{{SERVICE_NAME}}` in two files; it does **not** auto-register routes in gateway or docker-compose.
- Bootstrap script supports both `docker compose` and `docker-compose` and runs `prisma db push --accept-data-loss` inside the `example-service` container.
- No test suites/config are currently wired in repo-level CI despite `test` scripts at root.

## Existing Governance Docs (use as policy input, not source of implementation truth)
- `.specify/memory/constitution.md`
- `specs/004-forgekit-version-control/spec.md` (documents trunk-based flow on `master` + Conventional Commits)
- `docs/ai-agent-structure.md` (developer guide explaining the `.ai/` folder structure and usage)

## AI Context Files

All AI governance files live under `.ai/`. Load only what is relevant to your current task.

### `.ai/rules/` — Modular governance rules (load when applicable)
| File | When to load |
|------|-------------|
| `.ai/rules/code-style.md` | Any source code change |
| `.ai/rules/testing.md` | Always — on any implementation task |
| `.ai/rules/api-conventions.md` | Any HTTP handler, middleware, or route change |
| `.ai/rules/service-architecture.md` | New service, shared package, or Docker config change |

### `.ai/agents/` — Specialized sub-agent personas
| File | Invocation |
|------|-----------|
| `.ai/agents/code-reviewer.md` | *"Act as code reviewer for [branch/diff]"* |
| `.ai/agents/security-auditor.md` | *"Act as security auditor for [files/feature]"* |
| `.ai/agents/scaffold-assistant.md` | *"Act as scaffold assistant, I want to add [service] on port [N]"* |
| `.ai/agents/qa-tester.md` | *"Act as QA tester for [feature/spec path]"* |

### `.ai/skills/` — Repeatable workflow procedures
| File | Invocation phrase |
|------|------------------|
| `.ai/skills/doc-sync.skill.md` | *"Execute Doc Sync Skill"* |
| `.ai/skills/pr-generator.skill.md` | *"Generate a PR message for these changes"* |
| `.ai/skills/spec-audit.skill.md` | *"Execute Spec Audit for [spec path]"* |
| `.ai/skills/constitution-check.skill.md` | *"Execute Constitution Check"* |

### `.ai/hooks/` — Runnable automation scripts
| Script | Usage |
|--------|-------|
| `.ai/hooks/validate-commit-message.js` | `node .ai/hooks/validate-commit-message.js "<message>"` |
| `.ai/hooks/pre-scaffold.js` | `node .ai/hooks/pre-scaffold.js <service-name> <port>` |
