---
name: florist-backend-contracts
description: "Use when implementing or refactoring florist backend modules and shared contracts. Triggers: NestJS controller/service/module work, DTO design, RESTful API design, packages/contracts updates, shared enums and entities, sync protocol changes, SQLite and MySQL sync contracts, backend maintainability."
argument-hint: "Describe the NestJS module, DTO, service, controller, or shared contract work you need"
---

# Florist Backend Contracts

## When To Use

- Add or refactor NestJS modules in apps/server.
- Create DTOs, controllers, services, or response contracts.
- Define or update shared entities, enums, or sync protocols in packages/contracts.
- Review whether backend changes fit the florist architecture.

## Current Backend Boundaries

- `apps/server/src/modules`: backend business modules
- `packages/contracts`: shared entities, enums, pagination, sync payloads, and conflict contracts

## Core Rule

Controllers stay thin, services own orchestration, and contracts stay stable.

## Backend Procedure

1. Start from the business boundary: module, controller, service, DTO, or shared contract.
2. If the shape must be shared with frontend, define or update it in `packages/contracts` first.
3. Use DTO classes for request validation in NestJS.
4. Keep controller methods small: read params, call service, return result.
5. Put aggregation, permission checks, mapping, and workflow sequencing in services.
6. Ensure response structures are directly consumable by the frontend.

## Contract Rules

- Shared enums and entities belong in `packages/contracts`.
- Frontend-only view models should not be pushed into contracts prematurely.
- Sync-related changes must include explicit versions, identifiers, and conflict metadata.
- Avoid “万能 DTO” patterns; split query, create, update, and response shapes.

## Maintainability Rules

- Do not put business logic in controllers.
- Do not make services return raw persistence-layer structures if the frontend cannot consume them directly.
- Do not add parallel contract definitions in both frontend and backend.
- Keep module boundaries clear and avoid premature microservice-style fragmentation.

## Validation

1. Run `pnpm --filter @florist/server build`.
2. If contracts changed, verify the frontend still typechecks with `pnpm --filter @florist/client typecheck`.

## References

- [backend-reference](./references/backend-reference.md)
