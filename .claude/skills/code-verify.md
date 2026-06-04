---
name: code-verify
description: 代码校验 & 安全工具 — 语法/TS 类型/编译规范自动校验，归档高频报错
triggers:
  - 代码校验
  - 代码检查
  - 类型检查
  - 编译检查
  - code verify
  - lint
---

# 代码校验 & 安全工具

## 前置规则

- **修改前先读取最新源码** — 确保基于当前版本操作，避免基于过时内容产生冲突。
- **命令执行前预览** — 对文件系统或数据库有影响的命令，先展示将要执行的操作，减少误操作风险。

## 自动校验项

每次代码修改后自动执行：

| 校验项 | 命令 | 适用范围 |
|---|---|---|
| TypeScript 类型检查 | `pnpm typecheck` | 全项目 |
| Prettier 格式检查 | `pnpm format:check` | 全项目 |
| 服务端编译 | `pnpm --filter @florist/server build` | server 变更 |
| 共享类型编译 | `pnpm --filter @florist/contracts build` | contracts 变更 |

## 批量校验

- ≥3 个文件修改时，可启用 Agent 并行校验各子项目。
- 校验失败时，先展示错误摘要，询问用户后再进行修复。

## 高频报错归档

- 将反复出现的报错类型（类型不匹配、导入路径错误、环境变量缺失等）记录并归类。
- 累计 ≥3 次同类型报错时，主动建议加入快捷指令库。
