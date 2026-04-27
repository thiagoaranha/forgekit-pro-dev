FROM node:22-alpine AS base
WORKDIR /app
# Enable pnpm and install dependencies
RUN apk add --no-cache openssl
RUN corepack enable

FROM base AS builder
# Copy workspace config and package.json files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/services/{{SERVICE_NAME}}/package.json ./apps/services/{{SERVICE_NAME}}/
COPY packages/shared-observability/package.json ./packages/shared-observability/
COPY packages/shared-tooling/package.json ./packages/shared-tooling/
RUN pnpm install --prod=false

# Copy source and build
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/services/{{SERVICE_NAME}} ./apps/services/{{SERVICE_NAME}}/
RUN pnpm --filter {{SERVICE_NAME}} build

FROM base AS runner
ENV NODE_ENV=production
# Copy over
COPY --from=builder /app /app
WORKDIR /app/apps/services/{{SERVICE_NAME}}

EXPOSE {{SERVICE_PORT}}
HEALTHCHECK --interval=5s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:{{SERVICE_PORT}}/health/live').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
CMD ["npm", "start"]
