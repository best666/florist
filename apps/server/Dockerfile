# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/server apps/server
COPY packages/contracts packages/contracts
RUN pnpm --filter @florist/server prisma:generate
RUN pnpm --filter @florist/server build:prod

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /workspace
COPY --from=build /workspace /workspace
WORKDIR /workspace/apps/server
RUN mkdir -p var/uploads var/backups .runtime
EXPOSE 3000
CMD ["sh", "./docker-entrypoint.sh"]
