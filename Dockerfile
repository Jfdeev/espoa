# Stage 1: build
FROM node:22-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# Build shared package first, then bundle API into single dist/app.js
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
