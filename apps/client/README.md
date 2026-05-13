# client 应用说明

这里是养花人前端应用，基于 UniApp 最新版与 Unibest 工程能力搭建。

## 当前约束

- 仅使用 TypeScript，禁止 any。
- 仅使用 UnoCSS 原子类，不新增 CSS、SCSS、LESS 文件。
- 顶层目录遵循 src/api、src/components、src/hooks、src/interfaces、src/pages、src/store、src/utils。
- 微信小程序与 H5 双端差异统一通过条件编译和平台适配函数处理。
- 本地缓存默认走 AES 加密持久化封装。

## 开发命令

- pnpm dev:h5
- pnpm dev:mp-weixin
- pnpm build:h5
- pnpm build:mp-weixin

## 环境变量策略

- 仓库只提交 `env/*.example` 示例文件，不提交真实 `.env` 配置。
- 当前本地运行统一从 `env` 目录读取，按 `env/.env` -> `env/.env.{mode}` 的顺序合并配置。
- 新成员初始化时，先复制 `env/.env.example` 为 `env/.env`，再按需复制 `env/.env.development.example`、`env/.env.production.example` 做环境覆盖。
- 若接入真实 AppID、线上地址或密钥，只保留在本地环境文件，不进入 git。
- `vite.config.ts` 和运行时代码共用同一套 env 解析逻辑，默认值与示例文件保持一致。
