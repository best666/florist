---
name: florist-frontend-architecture
description: "Use when building or refactoring florist frontend code in apps/client. Triggers: UniApp page development, Unibest architecture, Vue3 page/component split, Pinia store design, hooks/composables, request wrapper usage, AES storage, UnoCSS-only styling, H5 and mp-weixin conditional compilation, frontend maintainability."
argument-hint: "Describe the frontend page, component, hook, store, request, or platform work you need in apps/client"
---

# Florist Frontend Architecture

## When To Use

- Add or refactor pages in apps/client.
- Create or adjust components, hooks, stores, interfaces, or utils.
- Extend request, storage, platform adaptation, or UnoCSS theme behavior.
- Review whether a frontend change fits the current florist architecture.

## Core Rule

Work with the existing frontend foundation, not around it.

## Current Frontend Boundaries

- `src/api`: request entry by business domain
- `src/components`: reusable UI and local interaction units
- `src/hooks`: reusable side effects and state machines
- `src/interfaces`: shared frontend types, enums, HTTP and platform contracts
- `src/pages`: route-level pages and orchestration
- `src/store`: Pinia shared state
- `src/utils`: request, storage, env, platform, and pure utilities

## Mandatory Reuse Points

Before adding any new abstraction, check these files first:

- `src/utils/request.ts`
- `src/utils/storage.ts`
- `src/utils/platform.ts`
- `src/utils/env.ts`
- `src/interfaces/index.ts`
- `src/store/index.ts`

Do not create a second request layer, a second storage utility, or a parallel platform adapter unless the current foundation is fundamentally insufficient.

## Architecture Procedure

1. Decide whether the task belongs to page orchestration, reusable component, hook, store, or utility.
2. Keep page-only state in the page unless it is a true reusable side-effect state machine.
3. Push request addresses and data adaptation into `src/api` or `src/utils`, never directly into pages.
4. Reuse `src/interfaces` or `packages/contracts` before adding new types.
5. Keep platform differences behind `#ifdef` / `#ifndef` and utility wrappers.
6. Prefer UnoCSS classes and shortcuts over style blocks.

## Frontend Best Practices

- Prefer `script setup` and keep template logic shallow.
- Use `storeToRefs` when destructuring Pinia state.
- Keep components single-purpose and prop-driven.
- Put pure formatting and light transforms in utils, not hooks.
- Put retry, loading, permission, upload, pagination, or scroll state machines in hooks when reused.
- In `exactOptionalPropertyTypes`, omit fields instead of passing `undefined`.

## Styling Rules

- Use UnoCSS only by default.
- Reuse tokens and shortcuts from `uno.config.ts`.
- Only add a style block for pseudo-elements, keyframes, or unavoidable deep overrides.

## Platform Rules

- Prefer `uni` APIs.
- Never call H5-only APIs directly from shared logic without wrapping them.
- Isolate `window`, `document`, and mini-program-only capabilities in platform helpers.

## Validation

1. Run `pnpm --filter @florist/client typecheck`.
2. If config, route, env, or output changed, run `pnpm --filter @florist/client build:h5`.
3. If mini-program-only behavior changed, run `pnpm --filter @florist/client build:mp-weixin`.

## References

- [frontend-reference](./references/frontend-reference.md)
