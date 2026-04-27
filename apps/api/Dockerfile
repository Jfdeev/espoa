# Stage 1: build (needs full monorepo for workspace deps)
FROM node:22-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

# Build database package first (API depends on it)
RUN pnpm --filter=@espoa/database run build

# esbuild bundles everything into a single dist/app.js
RUN pnpm --filter=api run build

# Stage 2: lean runtime image
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/dist ./dist

# @espoa/database is already bundled — remove the workspace ref before npm install
RUN sed -i '/"@espoa\/database"/d' package.json && npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/app.js"]
