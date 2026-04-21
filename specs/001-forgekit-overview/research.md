# Phase 0 Research: ForgeKit Architectural Decisions

## 1. Local Orchestration Structure
- **Decision:** Docker Compose (`docker-compose.yml`) located in `infra/compose`.
- **Why:** Universally supported, allows seamless spin-up of RabbitMQ and PostgreSQL alongside the services. Testcontainers will be used dynamically within Vitest suites to spin up short-lived databases, ensuring no port clashes with the main local orchestration during test execution.

## 2. Authentication Baseline (JWT)
- **Decision:** Fastify JWT Plugin (`@fastify/jwt`) loaded at the API Gateway.
- **Mechanism:** A static development secret is injected. A simple endpoint `GET /auth/dev-token` will be exposed (only in local environments) to mint tokens containing mocked `sub` and `role` claims.
- **Propagation:** Token claims are serialized to string headers (`X-ForgeKit-User-Id`, `X-ForgeKit-Role`) and forwarded to internal microservices via Fastify HTTP proxies. Internal services trust the gateway blindly, reducing coupling.

## 3. Scaffolding Strategy
- **Decision:** Plain Node.js script using `fs` and simple string replacements.
- **Why:** Avoids tying the project to heavy generators like Plop or Yeoman. The script will sit in `scripts/scaffold`, copy `packages/service-template`, rename references in `package.json`, and append lines to `infra/compose/docker-compose.yml` to automatically register the new container.

## 4. CI Integration Components
- **Decision:** GitHub Actions (`.github/workflows/ci.yml`).
- **Jobs:**
  1. **Lint & Format**: Prettier check + ESLint.
  2. **Test & Coverage**: Vitest run asserting `lines: 80` in coverage metrics.
  3. **Security Constraints**: `npm audit` (via pnpm) and hardcoded secret sweeping using standard CI actions tools.
  4. **Build Check**: Ensure `pnpm -r build` succeeds without `tsc` emitting errors.
