# Frontend Reference

## Decision Heuristics

- Add to `pages` when the logic is route-specific orchestration.
- Add to `components` when the UI block is reusable or makes the page clearer.
- Add to `hooks` only when logic forms a reusable side-effect state machine.
- Add to `store` only for cross-page shared or persisted state.
- Add to `utils` for pure functions, adaptation helpers, and foundation utilities.

## Maintainability Checks

- Is this duplicating request, storage, env, platform, or interface utilities?
- Is page-only state being unnecessarily promoted into store or hook?
- Is platform branching leaking into page templates?
- Is there a cleaner split between orchestration and presentation?
- Are new types actually frontend-local, or should they live in packages/contracts?

## Red Flags

- New `http` or `request` folders parallel to `src/utils/request.ts`
- New `types` folders that duplicate `src/interfaces`
- Large pages mixing API calls, data adaptation, and UI details in one file
- Components with business orchestration and cross-page state writes
- New style files for layouts that UnoCSS already covers
