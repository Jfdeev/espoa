# Build this Dockerfile from the repository root as context:
#   docker build -f apps/api/Dockerfile .
# On Railway: Root Directory must be blank (repo root).

# Stage 1: build
FROM node:22-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy only what's needed for the monorepo build (keeps context small)
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY turbo.json ./
COPY packages/database ./packages/database
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile

# Build shared package first, then bundle API into a single dist/app.js
RUN pnpm --filter=@espoa/database run build
RUN pnpm --filter=api run build

# Stage 2: lean runtime
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/dist ./dist

# @espoa/database is inlined into dist/app.js — remove the workspace ref before npm install
RUN sed -i '/"@espoa\/database"/d' package.json && npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/app.js"]
