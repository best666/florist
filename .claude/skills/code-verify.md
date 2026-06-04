---
name: code-verify
description: 代码校验清单 — 修改后自动执行 typecheck。不单独调用，由 debug/batch-fix 完成后自动触发。
triggers:
  - 校验
  - 类型检查
---

# 校验清单

本技能不单独调用，由 [[debug]] Phase 3 和 [[batch-fix]] Phase 2 自动触发。

## 执行顺序

遇错即停，不继续下一步：

| # | 命令 | 条件 |
|---|---|---|
| 1 | `pnpm typecheck` | 任何修改后 |
| 2 | `pnpm --filter @florist/contracts build` | 改了 contracts |
| 3 | `pnpm --filter @florist/server build` | 改了 server |

## 错误分类

```
本次修改引入: M 个 → 自动修复
已有报错: K 个 → 过滤，不碰
不确定: → 展示给用户确认
```

## 约束

- 已有报错不顺手修复
- 格式问题不属于校验范围（Prettier 会自动处理）
