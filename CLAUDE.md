# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Florist (植愈日记)** — a plant care journal app. Monorepo with pnpm workspaces. TypeScript full-stack, Python AI agent. Targets H5 (mobile web) + WeChat Mini Program via UniApp.

## Commands

```bash
# Development
pnpm dev                    # Start everything (MySQL + server + AI agent + H5 frontend)
pnpm prod                   # Start in production mode (NODE_ENV=production)
pnpm dev:h5                 # H5 frontend only (port 9000)
pnpm dev:mp-weixin          # WeChat Mini Program dev
pnpm dev:server             # NestJS backend in watch mode (port 3000)
pnpm dev:server:test        # Backend with florist_test database
pnpm dev:agent              # AI agent Python service (port 8000)
pnpm dev:db                 # Start MySQL Docker container

# Build
pnpm build                  # Build entire workspace
pnpm build:prod             # Production frontend build (minified, console removed)
pnpm --filter @florist/contracts build   # Build shared types (required before server/client)

# Database
pnpm db:deploy              # Apply Prisma migrations to current database
pnpm db:init-test           # Apply migrations to florist_test database
pnpm --filter @florist/server prisma:migrate:dev   # Create new migration from schema changes

# Type checking
pnpm typecheck              # Full workspace type check

# Formatting
pnpm format                 # Prettier format all files
pnpm format:check           # Check formatting only
```

### Database Reset

```bash
# Wipe and recreate both databases
docker exec florist-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS florist_test; CREATE DATABASE florist_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
pnpm db:deploy              # Apply to florist (development)
pnpm db:init-test           # Apply to florist_test
```

## Architecture

### Monorepo Layout

```
apps/client/          UniApp (Vue 3 + Pinia + UnoCSS) — H5 + WeChat Mini Program
apps/server/          NestJS 11 + Prisma 7 — REST API on port 3000, prefix /api
packages/contracts/   Shared TypeScript types, enums, interfaces (must build first)
services/ai-agent/    Python FastAPI — AI advice, diagnosis, chat (port 8000)
deploy/               Production Docker Compose (MySQL + server + nginx)
```

### Server Module Map

| Module | Purpose |
|---|---|
| Auth | Login (H5 phone code, WeChat), phone binding, session |
| Users | Profile CRUD, user resolution (default local-user fallback) |
| Flowers | Flower CRUD, soft-delete, batch sync (`/flowers/sync/batch`) |
| Records | Care records CRUD, undo (5-min window), batch sync |
| AiProxy | AI advice/diagnosis/chat proxy with tiered fallback |
| Members | Membership status (all features currently free/hardcoded) |
| Taxonomy | Custom categories, placements, difficulties, statuses |
| Feedback | Community feedback with voting, comments, AI moderation |
| Admin | Admin dashboard (separate cookie session, `/admin`) |
| Backups | Encrypted local backup/restore |
| Scheduler | Reminder config, push logs |
| Image | Upload + compression (sharp) |
| Weather | Weather queries, city search |

### Authentication

**No cookies/JWT.** All business APIs use `x-user-id` HTTP header. The `CurrentUserId` decorator extracts it. If absent, falls back to hardcoded `local-user` (anonymous local garden mode).

Phone login uses SHA-256 phone hash as cross-platform identity key. WeChat login uses SHA-256 openId hash. Cross-platform account merging happens via `bindPhoneToUser()` → `migrateAndBind()` which transactionally reassigns all flowers/records/taxonomy to the target user.

### Data Sync Architecture

**Offline-first, last-writer-wins by `updatedAt`/`createdAt` timestamps.**

- All Pinia stores use `persist: true` with AES-encrypted localStorage
- CRUD operations always work locally immediately; network errors silently fall back
- `refreshGardenContext()` (auth store) — bidirectional merge called on login/logout: pushes local data, pulls server data, compares timestamps
- `syncLocalGarden()` (app store) — called on app launch/show; uses `initializeGarden()`/`initializeRecordCenter()` which also push local-only and locally-updated items
- Sync endpoints: `POST /flowers/sync/batch`, `POST /records/sync/batch`

### Client State (6 Pinia stores)

- **app** — runtime platform, network status, sync orchestration
- **auth** — session (AES-encrypted), login/logout, `refreshGardenContext()` merge engine, `hasPendingSyncData` getter
- **flowers** — active flowers + recycle bin, 8s freshness throttle, offline-first CRUD
- **records** — care records + undo logs, cooldown logic, 5-min undo window
- **member** — membership caching, all benefits hardcoded `true` (no paywall)
- **flowerTaxonomy** — custom taxonomy CRUD, show/hide defaults

### AI Tiered Fallback

1. AI Agent (Python FastAPI on port 8000) — if configured with valid URL
2. Direct OpenAI-compatible API (DeepSeek) — if API key set
3. Local deterministic fallback functions — always available, Chinese plant care advice

Results cached in NestJS `RuntimeCacheService` with configurable TTL.

### Key Patterns

- **Entity IDs**: `{prefix}-{timestamp}-{random8chars}` format (e.g., `usr-lz4x8k2y-a1b2c3d4`)
- **Sensitive fields**: AES-256-GCM encrypted on server (`cityCipher`, `phoneMaskedCipher`) and client (all localStorage)
- **Styling**: UnoCSS only, no CSS/SCSS/LESS files. `dark:` prefix for dark mode. Custom theme via CSS variables (`--color-mint`, `--color-cream`, etc.)
- **API calls**: `http.post/get` from `@/utils/request.ts` — auto-injects `x-user-id` header, duplicate cancellation, auto retry (1x for GET), Chinese error messages
- **Conditional compilation**: `#ifdef MP-WEIXIN` / `#ifndef MP-WEIXIN` for platform-specific code
- **Page routing**: Auto-generated by `@uni-helper/vite-plugin-uni-pages` from `src/pages/` directory

### Environment Files

**Server** (`apps/server/env/`): `.env.development` (florist DB), `.env.test` (florist_test DB), `.env.production` (remote), `.env` (fallback). Loaded by `NODE_ENV` via `getServerEnvFilePaths()` in `server-env.ts`.

**Client** (`apps/client/env/`): `.env.development`, `.env.test`, `.env.production`. Loaded by Vite `--mode` flag. Key vars: `VITE_SERVER_BASEURL`, `VITE_APP_PROXY_ENABLE`, `VITE_DELETE_CONSOLE`.

### Database

MySQL 8.4 in Docker (port 3307). Database `florist`, user `florist`/password from `MYSQL_PASSWORD` env var, root password from `MYSQL_ROOT_PASSWORD` env var. Separate `florist_test` database for testing. Prisma with MariaDB adapter (`@prisma/adapter-mariadb`). Migrations in `apps/server/prisma/migrations/`.

### Constants to Know

- `DEFAULT_LOCAL_USER_ID = 'local-user'` — anonymous/guest user ID
- `FLOWER_CENTER_FRESHNESS_MS = 8000` — flower data cache TTL
- `RECORD_UNDO_WINDOW_MS = 300000` — 5-min undo window
- `ClientPlatform.H5 = 'h5'`, `ClientPlatform.MpWeixin = 'mp-weixin'`

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project Skills

Skills are stored in `.claude/skills/`. Invoke with `/skill-name` or by mentioning the trigger keywords.

| Skill | 触发关键词 | 用途 |
|---|---|---|
| [debug](.claude/skills/debug.md) | 调试, debug, 最小修改, commit | 定位根因 → 最小修改 → diff + 验证 + git 提交 |
| [batch-fix](.claude/skills/batch-fix.md) | 批量修复, 并行处理 | ≥3 文件先确认范围 → 流水线执行 → 汇总报告 |
| [code-verify](.claude/skills/code-verify.md) | 校验, 类型检查 | 修改后自动 typecheck，遇错即停，过滤已有报错 |
| [component-library](.claude/skills/component-library.md) | 组件库, 抽取组件 | ≥3 处重复逻辑时建议抽取，输出源码 + 示例 + 文档 |
| [shortcut-commands](.claude/skills/shortcut-commands.md) | 快捷指令, alias | 高频操作累计 ≥3 次后建议生成别名 |
| [ask-dont-guess](.claude/skills/ask-dont-guess.md) | 需要信息, ask first | 缺信息主动问，需决策列选项，禁止猜测 |
| [check-sensitive](.claude/skills/check-sensitive.md) | 提交, commit, 敏感信息, 检查泄露 | 每次提交前检查 API Key、密码、Token 等敏感信息 |
