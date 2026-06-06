---
name: shortcut-commands
description: 快捷指令库 — 高频操作累计 ≥3 次后自动建议生成别名，支持模板导入。不强制即时生成。
triggers:
  - 快捷指令
  - 快捷键
  - alias
---

# 快捷指令库

## 触发条件

在开发过程中，同一命令/操作序列**累计出现 ≥3 次**时，自动建议生成别名。

**不触发**：出现 1-2 次、一次性操作。

## 执行协议

### 识别 → 建议

```
操作 "[命令序列]" 已出现 3 次。

建议生成别名:
/shortcut-name — [一句话描述]

是否创建？
```

### 创建

用户确认后，写入本文件"当前快捷指令"段：

```markdown
| 别名 | 命令 | 说明 |
|---|---|---|
| /start | pnpm dev | 启动全栈开发 |
| /check | pnpm typecheck | 类型检查 |
```

### 模板导入

新项目可直接导入以下通用模板：

| 别名 | 命令 | 场景 |
|---|---|---|
| /start | 项目启动命令 | 任何项目 |
| /check | 类型 + 格式检查 | TypeScript 项目 |
| /db-reset | 数据库重置脚本 | 有数据库的项目 |
| /build | 生产构建 | 任何构建工具 |

---

## 当前项目快捷指令

| 别名 | 命令 | 说明 |
|---|---|---|
| /start | `pnpm dev` | 启动全栈开发环境 |
| /check | `pnpm typecheck` | 全项目类型检查 |
| /db-reset | `docker exec florist-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS florist_test; CREATE DATABASE florist_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" && pnpm db:deploy && pnpm db:init-test` | 重置开发 + 测试数据库 |

---
*调试中累计 ≥3 次的高频操作将自动追加至此。*
