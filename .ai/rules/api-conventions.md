# Rule: API Conventions

> Scope: All HTTP endpoints in `apps/gateway` and `apps/services/**`.
> Source: Architecture reality from `AGENTS.md` + Constitution §IV (Security) + §V (Observability).

## Authentication & Authorization

- Every endpoint that mutates state or returns sensitive data MUST enforce JWT verification.
- The Gateway handles JWT verification centrally. Services behind the gateway MUST NOT re-verify JWT — trust the forwarded identity headers.
- Forwarded identity headers from the Gateway: `x-user-id`, `x-user-role` (and others as defined).
- Public endpoints (e.g., `/health`) are explicitly opted out of auth — this must be a deliberate, documented decision.
- Role-based access control (RBAC): check `x-user-role` header at the route/handler level when role restrictions apply.

## Correlation ID Propagation

- Every incoming request MUST have a `x-correlation-id` header.
- If not present, the Gateway generates one before forwarding. Services must accept it as-is.
- The correlation ID MUST appear in **every log entry** generated during that request's lifecycle.
- Use `packages/shared-observability` correlation ID helpers — do not implement this from scratch.
- When making outbound HTTP calls to other services, forward the correlation ID.

## Input Validation

- ALL external input (body, query params, headers, path params) MUST be validated with **Zod schemas** before any processing.
- Use `packages/shared-tooling` for env variable parsing (Zod-based).
- Return `400 Bad Request` with a structured error body for validation failures. Never let unvalidated data reach business logic.
- Validation schemas must be defined in a dedicated `schemas.ts` file per route group.

## Structured Logging

- Use **Pino** logger from `packages/shared-observability`. Never use `console.log` in production code.
- Every log entry MUST include: `timestamp`, `level`, `service`, `correlationId`.
- **Never log**: secrets, tokens, passwords, PII, or full request bodies containing sensitive fields.
- Log levels: `info` for normal operations, `warn` for recoverable issues, `error` for failures with stack traces.

## HTTP Response Standards

- **Success responses**: `2xx` with a consistent JSON envelope `{ data: ... }` or plain object depending on service conventions.
- **Error responses**: Use a consistent error envelope:
  ```json
  { "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
  ```
- **Status codes**: Use semantically correct HTTP codes — `201` for creation, `204` for no content, `404` for not found, `409` for conflicts, `422` for business validation failures.
- Never expose internal stack traces or database error messages to the client.

## Health Endpoints

- Every service MUST expose `GET /health` returning `200 OK` with `{ "status": "ok" }`.
- The bootstrap script and Docker Compose health checks depend on this endpoint — do not modify its path or response shape without updating both.
