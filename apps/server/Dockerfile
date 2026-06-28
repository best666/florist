# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/client/package.json apps/client/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/server apps/server
COPY packages/contracts packages/contracts
RUN pnpm --filter @florist/contracts build
RUN pnpm --filter @florist/server prisma:generate
RUN pnpm --filter @florist/server build:prod
# 删除 devDependencies，缩小最终镜像体积（prisma 已移至 dependencies 以便运行时迁移）
RUN pnpm prune --prod

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /workspace/apps/server
COPY --from=build /workspace/apps/server/dist ./dist
COPY --from=build /workspace/apps/server/prisma ./prisma
COPY --from=build /workspace/apps/server/package.json ./package.json
COPY --from=build /workspace/apps/server/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=build /workspace/packages/contracts /workspace/packages/contracts
COPY --from=build /workspace/node_modules /workspace/node_modules
COPY --from=build /pnpm /pnpm
RUN mkdir -p var/uploads var/backups .runtime && \
    useradd --create-home --shell /bin/bash florist && \
    chown -R florist:florist /workspace && \
    chown -R florist:florist /pnpm
USER florist
EXPOSE 3000
CMD ["sh", "./docker-entrypoint.sh"]
