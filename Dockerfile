FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy entire monorepo (respects .dockerignore)
COPY . .

# Install all workspace dependencies
RUN pnpm install --ignore-scripts

# Build database package first (API depends on it at runtime)
WORKDIR /app/packages/database
RUN pnpm run build

# Build API
WORKDIR /app/apps/api
RUN pnpm run build

# Create standalone production bundle (resolves workspace symlinks)
WORKDIR /app
RUN pnpm --filter=api deploy --prod /prod/api

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /prod/api/node_modules ./node_modules
COPY --from=base /prod/api/dist ./dist

EXPOSE 3001
CMD ["node", "dist/app.js"]
