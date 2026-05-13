# server 应用说明

这里是养花人后端服务，基于 NestJS + Prisma + MySQL，维持轻量单体结构，优先保证个人开发阶段的易维护与低资源占用。

## 当前能力

- 分层模块：controller / service / dto，用户、植株云端、记录、会员、反馈、备份均已落库。
- Prisma 数据源已切换为 MySQL，字段与共享 contracts 对齐。
- 默认本地用户机制，未接鉴权前也能稳定写入 userId 关联数据。
- 全局能力：CORS、请求校验、限流、请求追踪、响应压缩。
- 敏感字段加密：用户城市、手机号展示值、反馈内容使用应用层 AES 加密。
- 定时备份：每天凌晨自动导出加密备份文件，同时支持手动触发。

## 开发命令

- pnpm --filter @florist/server start:dev
- pnpm --filter @florist/server build
- pnpm --filter @florist/server build:prod
- pnpm --filter @florist/server prisma:generate

## 本地 MySQL

推荐直接使用 docker-compose.mysql.yml 启本地 MySQL：

- cd apps/server
- docker compose -f docker-compose.mysql.yml up -d

默认数据库：

- 数据库名：florist
- 用户名：florist
- 密码：florist123
- 端口：3306

## 环境变量策略

- 仓库只提交 env/*.example 示例文件，不提交真实 .env 配置。
- 本地运行统一从 env 目录读取，按 env/.env -> env/.env.{mode} 的顺序合并配置。
- 新成员初始化时，先复制 env/.env.example 为 env/.env，再按需复制 env/.env.development.example、env/.env.production.example 做环境覆盖。
- 数据库连接串、加密密钥、AI 中转密钥等敏感配置不得入库。

## 数据库说明

核心表：

- users：用户基础资料
- flowers：植株云端档案
- care_records：养护记录
- members：会员状态与权益
- feedback：反馈内容与图片

辅助表：

- flower_images
- care_record_images
- feedback_images
- record_undo_logs
- reminder_configs
- reminder_push_logs

## 备份说明

- 默认备份目录：apps/server/var/backups
- 备份文件为加密文本 .bak
- 接口：GET /api/backups/status、POST /api/backups/run
- 定时任务：每天凌晨 3 点执行一次

## 运行提醒

- 修改 prisma/schema.prisma 后先执行 pnpm --filter @florist/server prisma:generate。
- 若已连上真实 MySQL，再执行 Prisma migration 创建表结构。
- 当前 build:prod 会在 nest build 后对 dist 下 js 文件做最小化压缩。
