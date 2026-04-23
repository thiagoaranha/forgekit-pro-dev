# ForgeKit Agent Notes

## Runtime + Workspace Facts
- Monorepo uses `pnpm` workspaces (`apps/**`, `packages/*`) with Node `>=22` and pnpm `>=9`.
- There is currently no root `README`; rely on executable sources (`package.json`, workflow, scripts) over `specs/` prose when they differ.
- CI targets `master` and runs: `pnpm install --frozen-lockfile` -> `pnpm run lint` -> `pnpm run build` (tests are commented out in CI).

## High-Value Commands (from repo scripts)
- Full local stack (Docker + db sync + health wait): `pnpm boot` (cross-platform Node script at `scripts/bootstrap/start.js`).
- Stop local stack: `pnpm down`.
- Run all workspace dev/build/lint/test scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`.
- Format repo files: `pnpm format`.
- Prisma helpers are recursive from root: `pnpm db:push`, `pnpm db:generate`.

## Focused Commands You Will Need
- Gateway only: `pnpm --filter gateway dev` (or `build` / `start`).
- Example service only: `pnpm --filter example-service dev`.
- Example service Prisma: `pnpm --filter example-service db:generate` and `pnpm --filter example-service db:push`.
- Scaffold a new service from template: `pnpm scaffold <service-name>`.

## Architecture Reality (current code)
- Entry services: `apps/gateway` (port `3000`) and `apps/services/example-service` (port `3001`).
- Gateway issues dev JWT at `GET /auth/dev-token` (non-production only), verifies JWT on `/api/example/*`, and forwards identity headers plus `x-correlation-id`.
- Example service exposes health endpoints and `/items` CRUD-ish endpoints backed by Prisma/PostgreSQL.
- Shared libs used by services:
  - `packages/shared-observability`: Pino logger + correlation ID helper.
  - `packages/shared-tooling`: env parsing helper using Zod.
  - `packages/shared-testing`: Testcontainers helper (not yet wired into CI tests).

## Gotchas Likely To Waste Time
- `scripts/scaffold/index.js` only copies `packages/service-template` into `apps/services/<name>` and replaces `{{SERVICE_NAME}}` in two files; it does **not** auto-register routes in gateway or docker-compose.
- Bootstrap script supports both `docker compose` and `docker-compose` and runs `prisma db push --accept-data-loss` inside the `example-service` container.
- No test suites/config are currently wired in repo-level CI despite `test` scripts at root.
- `pnpm-lock.yaml` is not present in this checkout, but CI uses `--frozen-lockfile`; lockfile-sensitive changes should account for that.

## Existing Governance Docs (use as policy input, not source of implementation truth)
- `.specify/memory/constitution.md`
- `specs/004-forgekit-version-control/spec.md` (documents trunk-based flow on `master` + Conventional Commits)
