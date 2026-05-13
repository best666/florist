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
- 本地开发时可在 `apps/server` 下创建 `.env.local` 或其他本地环境文件。
- 数据库连接串、AI 中转密钥、对象存储密钥等敏感配置不得入库。
- 新成员初始化时，优先参考 `env/.env.example` 补齐本地配置。
