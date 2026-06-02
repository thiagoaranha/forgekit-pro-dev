# Rule: Service Architecture

> Scope: All microservices in `apps/services/**` and the gateway in `apps/gateway`.
> Source: Constitution §VI + `AGENTS.md` Architecture Reality.

## Current Architecture (Source of Truth)

```
apps/
├── gateway/           → Port 3000. Single entry point. Issues dev JWTs, verifies tokens, forwards requests.
└── services/
    └── example-service/  → Port 3001. CRUD endpoints, Prisma/PostgreSQL.

packages/
├── shared-observability/  → Pino logger + correlation ID helper
├── shared-tooling/        → Zod-based env parsing
├── shared-testing/        → Testcontainers helpers
├── shared-error-handling/ → Shared error types/handlers
├── shared-messaging/      → Event/message bus abstractions
├── shared-security/       → Auth/JWT utilities
└── service-template/      → Canonical template for new services
```

## Service Boundaries

- Each service has **one well-defined domain responsibility**. If you cannot state it in a single sentence, it is too broad.
- Services do NOT directly import from another service's source code — only through shared packages or HTTP/event contracts.
- **Data ownership is exclusive**: Each service owns its own database/schema. No service may query another service's database directly.

## Adding a New Service

Use the scaffold command:
```bash
pnpm scaffold <service-name>
```

**Critical gotchas after scaffolding** (the scaffold script does NOT do these automatically):
1. **Gateway registration**: Add the new route proxy in `apps/gateway/src/index.ts`.
2. **Docker Compose**: Add the new service container and its database (if needed) to `infra/docker-compose.yml`.
3. **Env variables**: Document all required env vars in the service's `.env.example`.
4. **Port assignment**: Choose an unused port and document it in `AGENTS.md`.

## Communication Patterns

- **Synchronous**: HTTP REST through the Gateway. Services do not call each other directly — all inter-service traffic routes through or alongside the Gateway.
- **Asynchronous**: Use `packages/shared-messaging` abstractions for event-driven communication. Never implement ad-hoc pub/sub.
- **No hardcoded service URLs**: Use environment variables for all inter-service addresses.

## Fault Tolerance

- Services MUST handle downstream failures gracefully — return a degraded response rather than crashing.
- Implement timeouts on all outbound HTTP calls. An unresponsive downstream must not block the caller indefinitely.
- A single service failure MUST NOT cascade to a system-wide outage.

## Independent Deployability

- Every service must be buildable, testable, and runnable in Docker in complete isolation.
- No service may require a coordinated deployment with another service to function correctly.
- Test this assumption periodically: run `docker compose up <service>` without starting dependent services.

## Shared Packages — Contribution Guidelines

- Only add to `packages/shared-*` what is genuinely reusable across 2+ services.
- Adding a new shared package requires updating: `pnpm-workspace.yaml`, `docker-compose.yml` (if needed), and `AGENTS.md`.
- Never break shared package public APIs without a migration path and version bump.
