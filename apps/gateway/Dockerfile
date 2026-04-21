FROM node:22-alpine AS base
WORKDIR /app
# Enable pnpm
RUN corepack enable

FROM base AS builder
# Copy workspace config and package.json files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/gateway/package.json ./apps/gateway/
COPY packages/shared-observability/package.json ./packages/shared-observability/
COPY packages/shared-tooling/package.json ./packages/shared-tooling/
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/gateway ./apps/gateway/
RUN pnpm --filter gateway build

FROM base AS runner
ENV NODE_ENV=production
# Just copy the built outputs and prod modules
# (In a real scenario, we'd prune devDependencies or use standalone builds)
COPY --from=builder /app /app
WORKDIR /app/apps/gateway

EXPOSE 3000
CMD ["npm", "start"]
