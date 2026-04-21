FROM node:22-alpine AS base
WORKDIR /app
# Enable pnpm
RUN corepack enable

FROM base AS builder
# Copy workspace config and package.json files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/services/example-service/package.json ./apps/services/example-service/
COPY packages/shared-observability/package.json ./packages/shared-observability/
COPY packages/shared-tooling/package.json ./packages/shared-tooling/
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/services/example-service ./apps/services/example-service/
RUN pnpm --filter example-service run db:generate
RUN pnpm --filter example-service build

FROM base AS runner
ENV NODE_ENV=production
# Copy over
COPY --from=builder /app /app
WORKDIR /app/apps/services/example-service

EXPOSE 3001
CMD ["npm", "start"]
