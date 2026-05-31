FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
RUN corepack enable

FROM base AS builder
# Copy root workspace manifest files needed for pnpm install
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./

# Mirror ALL package.json files from the monorepo into the container,
# preserving their directory structure. This one step replaces the fragile
# pattern of manually listing each package — now any new workspace package
# is automatically picked up without touching this Dockerfile.
RUN --mount=type=bind,source=.,target=/src \
    find /src -name "package.json" \
        -not -path "*/node_modules/*" \
        -not -path "*/dist/*" \
        -not -path "/src/package.json" \
    | while read -r file; do \
        rel="${file#/src/}"; \
        mkdir -p "/app/$(dirname "$rel")"; \
        cp "$file" "/app/$rel"; \
    done

RUN pnpm install --prod=false

# Copy source and build
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/services/example-service ./apps/services/example-service/
RUN pnpm --filter example-service run db:generate
RUN pnpm --filter example-service... build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
WORKDIR /app/apps/services/example-service

EXPOSE 3001
CMD ["node", "dist/index.js"]
