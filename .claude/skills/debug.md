---
name: debug
description: 通用调试协议 — 定位根因 → 最小修改 → 输出 diff + 验证 + git 提交文案。信息不足时切 ask-dont-guess。
triggers:
  - 调试
  - debug
  - 排查
  - 报错
  - bug
  - 修一下
  - 最小修改
  - 最小改动
  - 提交
  - commit
---

# 调试 & 修改协议

每次修改代码时自动生效。

## Phase 1: 定位根因

```
1. 读报错 → 定位文件+行号
2. 读源码 → 理解上下文
3. 追溯数据流 → 找到触发异常的输入
```

**卡住**：3 步后无法确定根因 → [[ask-dont-guess]]，向用户要日志。

## Phase 2: 修复

修改前自检：
- 改的每一行是否直接服务需求？不是 → 不写
- 是否顺手改了相邻代码？是 → 撤回

**失败处理**：修复后用户仍报错 → [[ask-dont-guess]]，禁止第 2 次猜测性修复。

## Phase 3: 输出 + 校验

修改完成后输出：

```
## 根因
[一句话]

## 修改
[文件:行号] — [改了什么]

## 验证
1. [步骤] → 期望: [结果]
```

然后自动执行 [[code-verify#校验清单]]。

## Phase 4: 提交文案

修改涉及独立功能时，提供提交文案：

```
git commit -m "fix: [简述]"
git commit -m "feat: [简述]"
git commit -m "refactor: [简述]"
```

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>

## 修改后检查

- 改动了 `packages/contracts/`：提示 `pnpm --filter @florist/contracts build`
- 改动了共享函数：列出调用方供确认
- 涉及 ≥3 个文件：切 [[batch-fix]]

## 约束

遵循 CLAUDE.md：Think Before Coding、Simplicity First、Surgical Changes、Goal-Driven Execution。
