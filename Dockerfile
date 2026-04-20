FROM node:22-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --ignore-scripts

# Build database package first (API depends on it)
RUN pnpm --filter=@espoa/database run build

# Build API
RUN pnpm --filter=api run build

ENV NODE_ENV=production
EXPOSE 3001

WORKDIR /app/apps/api
CMD ["node", "dist/app.js"]
