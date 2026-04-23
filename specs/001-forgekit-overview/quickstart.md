# ForgeKit Quickstart Guide

## Prerequisites
- Node.js 22 LTS
- pnpm 9+
- Docker Desktop (or engine + compose installed)

## 1. Bootstrap Local Architecture
No more manual setups or scattered `.env` files. Spin the entire environment up in seconds from the root directory:

```powershell
pnpm boot
```

This ensures RabbitMQ, PostgreSQL, the API Gateway, and the Example Service mount correctly. It waits for the `health/live` check from the gateway.

## 2. API Gateway Endpoints
The gateway acts as the authentication wall and router.
- **Gateway Health**: `GET http://localhost:3000/health/live`
- **Example Service Proxy:** `GET http://localhost:3000/api/example/items`

## 3. Creating a new Microservice
Do you need a new domain service? Let ForgeKit generate the boilerplate according to the constitution:

```bash
node scripts/scaffold/index.js account-service
```

This creates `apps/services/account-service` featuring its own Fastify runtime hooked to the global logger and correlated testing structures.
