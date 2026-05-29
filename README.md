# 养花人

面向养花新手与绿植爱好者的双端应用，以微信小程序和 H5 为前端载体，配套 NestJS 后端与 MySQL 数据库。

## 技术栈

| 层 | 方案 |
|-----|------|
| 包管理 | pnpm workspace |
| 前端 | UniApp + Vue 3 + TypeScript + Pinia + UnoCSS |
| 后端 | NestJS + Prisma 7 |
| 数据库 | MySQL 8.x |
| 共享层 | packages/contracts（类型、枚举、接口契约） |
| 部署 | Docker + GitHub Actions |

## 仓库结构

```text
├── apps
│   ├── client/          UniApp 前端（H5 / 微信小程序）
│   └── server/          NestJS 后端
├── packages
│   ├── config/          共享配置
│   └── contracts/       前后端共享类型与契约
├── deploy/              Docker Compose 生产部署
└── docs/                架构文档
```

## 环境要求

- Node.js 20+
- pnpm 10+
- MySQL 8.x（本地二进制或 Docker）
- 微信开发者工具（小程序开发）

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动数据库

Docker 方式：

```bash
pnpm db:server:up
```

本地 MySQL 二进制（无需 Docker）：

```bash
pnpm --filter @florist/server db:local:start
```

启动后在 `127.0.0.1:3307` 运行，自动创建数据库和用户。停止：

```bash
pnpm --filter @florist/server db:local:stop
```

### 3. 数据库迁移

```bash
pnpm db:server:deploy
```

### 4. 依次启动后端和前端

```bash
pnpm dev:server     # 后端（默认 3000，被占用时自动切换）
pnpm dev:h5         # H5 前端（默认 9000）
pnpm dev:mp-weixin  # 微信小程序
```

H5 开发态代理会动态读取后端运行时端口文件，后端端口变化时无需手动修改前端配置。

## 根命令速览

| 命令 | 说明 |
|------|------|
| `pnpm dev:h5` | 启动 H5 前端 |
| `pnpm dev:mp-weixin` | 启动微信小程序 |
| `pnpm dev:server` | 启动后端 |
| `pnpm db:server:up` | Docker 启动 MySQL |
| `pnpm db:server:down` | Docker 停止 MySQL |
| `pnpm db:server:deploy` | 执行 Prisma 迁移 |
| `pnpm build` | 构建整个 workspace |
| `pnpm typecheck` | 全量类型检查 |

## 环境变量

### 前端（`apps/client/env/`）

| 变量 | 说明 |
|------|------|
| `VITE_APP_TITLE` | 应用标题 |
| `VITE_APP_PORT` | H5 开发端口 |
| `VITE_SERVER_BASEURL` | 后端地址 |
| `VITE_STORAGE_AES_KEY` | 本地加密密钥 |
| `VITE_WX_APPID` | 微信小程序 AppID |

示例文件：`apps/client/env/.env.example`

### 后端（`apps/server/env/`）

| 变量 | 说明 |
|------|------|
| `PORT` | 服务端口 |
| `DATABASE_URL` | MySQL 连接串 |
| `H5_LOGIN_PHONE` | H5 测试手机号 |
| `H5_LOGIN_CODE` | H5 测试验证码 |
| `WECHAT_MINI_PROGRAM_APP_ID` | 小程序 AppID |
| `WECHAT_MINI_PROGRAM_SECRET` | 小程序 Secret |
| `AI_PROXY_API_KEY` | AI 服务 API Key |

示例文件：`apps/server/env/.env.example`

## 认证与会话

业务接口通过请求头 `x-user-id` 识别用户，而非 Cookie 会话：

- H5：手机号 + 验证码登录（开发态使用 env 中的测试账号）
- 微信小程序：`uni.login` 获取 code 发送后端完成识别
- 未登录时核心功能被全局拦截，登录后自动注入 `x-user-id`

## 主要模块

| 模块 | 说明 |
|------|------|
| auth | 手机验证码登录、微信登录、会话管理 |
| flowers | 植株中心、回收站、批量同步 |
| records | 养护记录、撤回、时间线 |
| members | 会员状态与权益管理 |
| doctor | AI 病虫害识别、出差养护方案 |
| album | 成长相册、海报生成 |
| theme | 6 套莫兰迪色系皮肤切换 |
| backups | 本地备份与恢复（AES 加密） |
| weather | 天气与城市查询、每日提醒 |
| admin | 管理后台（独立 Cookie 会话） |

## 部署

生产环境采用 Docker Compose 单机三容器（Nginx + NestJS + MySQL）。详细说明见 [deploy/](deploy/) 目录。

CI/CD 通过 GitHub Actions 自动执行：
- PR → 类型检查 + 构建校验
- main → 构建镜像推送 GHCR + SSH 远程部署

## 常用验证

```bash
pnpm typecheck                        # 全量类型检查
pnpm --filter @florist/client build:h5       # H5 构建
pnpm --filter @florist/client build:mp-weixin  # 小程序构建
pnpm --filter @florist/server build          # 后端构建
```

## 常见问题

### 后端端口不是 3000

开发态下端口被占用会自动切换，查看当前端口：

```bash
cat apps/server/.runtime/dev-server.json
```

### H5 请求打错端口

检查后端是否启动、`dev-server.json` 是否存在、请求是否走 `/api` 代理。

### Docker 数据库起不来

改用本地 MySQL 二进制：

```bash
pnpm --filter @florist/server db:local:start
```

### 登录成功但数据未切换

确认请求头 `x-user-id` 已切换到新用户。

## 相关文档

- [前端 README](apps/client/README.md)
- [后端 README](apps/server/README.md)
- [架构说明](docs/architecture.md)
