---
name: component-library
description: 组件库管理 — 识别可复用公共逻辑，输出组件源码 + 使用示例 + 接入文档
triggers:
  - 组件库管理
  - 抽取组件
  - 组件复用
  - 公共组件
  - component library
  - shared component
---

# 组件库管理

## 触发条件

**仅在重构/代码优化阶段调用**，日常业务开发不强制抽取组件。

适用场景：
- 主动重构项目代码
- 用户明确要求优化代码结构
- 发现 ≥3 处重复的通用逻辑

## 执行流程

1. **识别可复用逻辑** — 扫描项目中重复出现的模式（UI 组件、工具函数、hooks/composables、类型定义）。
2. **抽取组件** — 将其提取到合适的公共目录：
   - UI 组件 → `apps/client/src/components/`
   - 工具函数 → `apps/client/src/utils/`
   - 服务端公共逻辑 → `apps/server/src/common/`
   - 共享类型 → `packages/contracts/`
3. **输出文档** — 每个抽取的组件必须附带：
   - 组件源码（文件路径 + 行号）
   - 使用示例（最小可运行代码片段）
   - 接入文档（props/参数说明、使用注意事项）

## 组件清单更新

- 更新项目组件目录清单，标记新增/变更的组件。
- 若已有组件清单文件（如 `COMPONENTS.md`），追加新条目。

## 不适用场景

- 仅使用一次的逻辑不抽取（遵循 Simplicity First 原则）。
- 业务耦合度高的代码不强行抽象。
