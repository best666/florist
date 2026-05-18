# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/client/package.json apps/client/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile

COPY apps/client apps/client
COPY packages/contracts packages/contracts

ARG VITE_APP_PUBLIC_BASE=/
ARG VITE_SERVER_BASEURL=/api
ARG VITE_APP_PROXY_ENABLE=false
ARG VITE_DELETE_CONSOLE=true

ENV VITE_APP_PUBLIC_BASE=$VITE_APP_PUBLIC_BASE
ENV VITE_SERVER_BASEURL=$VITE_SERVER_BASEURL
ENV VITE_APP_PROXY_ENABLE=$VITE_APP_PROXY_ENABLE
ENV VITE_DELETE_CONSOLE=$VITE_DELETE_CONSOLE

RUN pnpm --filter @florist/client build:h5

FROM nginx:1.27-alpine AS runner
COPY apps/client/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/client/dist/build/h5 /usr/share/nginx/html
EXPOSE 80
