---
name: minimal-change
description: 最小修改 & Git 版本管控 — 精准 diff、git 提交文案、关联依赖校验
triggers:
  - 最小修改
  - 最小改动
  - 精准修改
  - minimal change
  - surgical fix
---

# 最小修改 & Git 版本管控

## 执行标准

1. **仅修改目标需求代码** — 严格限定改动范围，不顺手重构、不优化无关代码。
2. **输出精准 diff** — 每次修改输出：
   - 文件路径 + 行号
   - 变更前后的代码对比
   - 变更原因一句话说明
3. **附 Git 提交文案**：
   ```bash
   git commit -m "fix: 问题简述"
   ```
   若为功能新增，使用 `feat:` 前缀；若为重构，使用 `refactor:` 前缀。

## 编码规范

- 优先复用已有公共组件/工具函数，参考项目 [CLAUDE.md](../../CLAUDE.md)。
- 多文件联动场景（≥3 文件）可选用 Agent 批量处理，确保一致性。

## 修改完成后

- 主动询问是否需要校验关联依赖文件（如类型定义、测试用例、调用方）。
- 若修改了共享类型（`packages/contracts/`），提示需要重新 `pnpm --filter @florist/contracts build`。
