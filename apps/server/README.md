# server 应用说明

这里是养花人后端服务，基于 NestJS 搭建，负责 AI 中转、图片处理、同步与定时任务等服务能力。

## 当前约束

- 统一使用 TypeScript 严格模式，禁止 any。
- Controller 保持薄，Service 负责业务编排。
- 前后端共享实体、枚举和同步协议优先复用 `@florist/contracts`。
- 涉及密钥、数据库和第三方服务地址的配置仅允许通过环境变量注入。

## 开发命令

- pnpm --filter @florist/server start:dev
- pnpm --filter @florist/server build

## 环境变量策略

- 仓库只提交 `env/*.example` 示例文件，不提交真实 `.env` 配置。
- 本地运行统一从 `env` 目录读取，按 `env/.env` -> `env/.env.{mode}` 的顺序合并配置。
- 新成员初始化时，先复制 `env/.env.example` 为 `env/.env`，再按需复制 `env/.env.development.example`、`env/.env.production.example` 做环境覆盖。
- 数据库连接串、AI 中转密钥、对象存储密钥等敏感配置不得入库。
- `ConfigModule` 会在应用启动时统一解析这些配置，并注入到 NestJS 运行时。
