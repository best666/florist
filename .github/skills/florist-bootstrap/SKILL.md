---
name: florist-bootstrap
description: "Use when initializing, scaffolding, or restructuring the 养花人 monorepo. Triggers: UniApp project setup, Unibest bootstrap, NestJS bootstrap, pnpm workspace structure, dual-end WeChat mini program and H5 setup, shared contracts, sync architecture, strict TypeScript, UnoCSS-only styling."
---

# Florist Bootstrap Skill

## When To Use

- Initialize the project from scratch.
- Add a new top-level app or package.
- Restructure folders, scripts, or workspace boundaries.
- Align commands, package names, and project layout with the real florist monorepo.

## Current Workspace Baseline

- apps/client: UniApp + Unibest frontend app, package name `@florist/client`
- apps/server: NestJS backend app, package name `@florist/server`
- packages/contracts: shared types, enums, sync contracts
- packages/config: shared configuration placeholders
- docs: architecture notes and engineering decisions

## Purpose

This skill captures the non-negotiable engineering constraints for the 养花人 project so future implementation work stays aligned with the product and architecture decisions.

## Stack Baseline

- Frontend: UniApp + Unibest + TypeScript + UnoCSS
- Targets: WeChat Mini Program and H5
- Backend: Node.js + NestJS in a lightweight modular monolith
- Data: local SQLite on client, MySQL in cloud, bidirectional synchronization
- Middleware: AI proxy, image compression, scheduled notification service

## Mandatory Rules

### TypeScript

- Enable strict mode everywhere.
- Do not use any.
- All entities, request payloads, response payloads, and service contracts must use interface or type.
- Enums must be extracted into shared files.

### Frontend

- Use UnoCSS only. Do not add custom CSS, SCSS, or LESS files unless there is a genuine selector-only edge case.
- Prefer the existing florist frontend foundation before adding new infrastructure.
- All platform differences must be isolated by conditional compilation and adapter files.
- Never expose API secrets or AI keys in client code.

### Backend

- Keep RESTful API design.
- Put AI-related secrets and third-party provider keys behind backend proxy services.
- Design every data mutation for rollback and recovery.
- Build sync-friendly APIs with explicit versioning and conflict metadata.

### UI

- Keep the visual language cute, soft, rounded, and low-pressure.
- Use 12px rounded corners, soft shadows, and macaroon-like colors.
- Avoid dense layouts and hard visual transitions.

## Suggested Workflow

1. Define or update shared contracts in packages/contracts first.
2. Add or adjust backend modules in apps/server second.
3. Implement frontend pages and adapters in apps/client last.
4. Validate both H5 and WeChat-specific branches before finishing.

## Validation Commands

- `pnpm --filter @florist/client typecheck`
- `pnpm --filter @florist/client build:h5`
- `pnpm --filter @florist/client build:mp-weixin`
- `pnpm --filter @florist/server build`

## Directory Intent

- apps/client: frontend application
- apps/server: backend application
- packages/contracts: shared types and sync protocol
- docs: architecture and implementation decisions

## Related Skills

- Use `florist-frontend-architecture` for page, component, hook, store, request, storage, UnoCSS, and platform adaptation work.
- Use `florist-backend-contracts` for NestJS module work, DTOs, controllers, services, and shared contracts.
