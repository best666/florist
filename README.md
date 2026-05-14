# 养花人

养花人是一个面向养花新手与绿植爱好者的双端应用项目，当前以微信小程序和 H5 为前端载体，配套一个 NestJS 后端服务与 MySQL 数据库。

这个仓库已经不是单纯的工程骨架，而是具备可运行的前后端联调能力，包含以下核心特性：

- UniApp 前端，支持 H5 和微信小程序双端开发
- NestJS 后端，提供植株、记录、会员、反馈、提醒、天气、AI 中转等接口
- Prisma + MySQL 数据持久化
- 前端本地 AES 加密持久化
- H5 手机号验证码登录与小程序微信登录入口
- 后端开发态自动切换空闲端口，前端 H5 代理自动跟随后端实际端口

## 技术栈

- 包管理：pnpm workspace
- 前端：UniApp + Vue 3 + TypeScript + Pinia + UnoCSS
- 后端：NestJS + Prisma 7 + MariaDB Adapter
- 数据库：MySQL
- 共享层：packages/contracts

## 仓库结构

```text
.
├── apps
│   ├── client                 # UniApp 前端应用（H5 / mp-weixin）
│   └── server                 # NestJS 后端服务
├── docs
│   └── architecture.md        # 架构说明
├── packages
│   ├── config                 # 共享配置占位目录
│   └── contracts              # 前后端共享类型、枚举、契约
├── README.md
├── package.json               # 根命令入口
└── pnpm-workspace.yaml
```

## 环境要求

推荐环境：

- Node.js 20+
- pnpm 10+
- MySQL 8.x
- 微信开发者工具（开发小程序时需要）

如果你不想依赖 Docker，本仓库当前也支持直接使用本地 MySQL 二进制在 apps/server/.mysql 下启动独立数据目录。

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动数据库

当前项目支持两种方式。

方式 A：Docker MySQL

```bash
pnpm db:server:up
```

方式 B：本地 MySQL 二进制

```bash
pnpm --filter @florist/server db:local:start
```

如果你使用本地 MySQL 二进制，默认会：

- 初始化 apps/server/.mysql/data
- 在 127.0.0.1:3307 启动 MySQL
- 自动创建 florist 数据库和 florist 用户

停止本地 MySQL：

```bash
pnpm --filter @florist/server db:local:stop
```

### 3. 执行数据库迁移

```bash
pnpm db:server:deploy
```

查看当前迁移状态：

```bash
pnpm db:server:status
```

### 4. 启动后端

```bash
pnpm dev:server
```

后端默认目标端口是 3000。

如果 3000 被占用，开发态会自动切到 3001、3002 等空闲端口，并把当前实际端口写入：

```text
apps/server/.runtime/dev-server.json
```

### 5. 启动前端

H5：

```bash
pnpm dev:h5
```

微信小程序：

```bash
pnpm dev:mp-weixin
```

H5 开发态代理会自动读取 apps/server/.runtime/dev-server.json，所以后端从 3000 自动切到 3001 时，前端不需要手动改 VITE_SERVER_BASEURL。

## 根命令说明

根 package.json 中常用命令如下：

```bash
pnpm dev:h5
pnpm dev:mp-weixin
pnpm dev:server
pnpm db:server:up
pnpm db:server:down
pnpm db:server:status
pnpm db:server:deploy
pnpm build
pnpm typecheck
```

它们的职责分别是：

- dev:h5：启动前端 H5 开发服务
- dev:mp-weixin：启动微信小程序开发服务
- dev:server：启动后端开发服务
- db:server:up：用 Docker 启动后端数据库
- db:server:down：停止 Docker 数据库容器
- db:server:status：查看 Prisma 迁移状态
- db:server:deploy：把迁移应用到数据库
- build：构建整个 workspace
- typecheck：检查整个 workspace 的类型

## 推荐开发流程

### 日常后端联调

```bash
pnpm --filter @florist/server db:local:start
pnpm db:server:deploy
pnpm dev:server
pnpm dev:h5
```

### 小程序联调

```bash
pnpm --filter @florist/server db:local:start
pnpm db:server:deploy
pnpm dev:server
pnpm dev:mp-weixin
```

## 环境变量

### 前端

前端环境文件目录：

```text
apps/client/env
```

当前关键配置：

- VITE_APP_PORT：前端开发端口，默认 9000
- VITE_SERVER_BASEURL：后端默认地址，默认 http://localhost:3000
- VITE_APP_PROXY_ENABLE：是否启用 H5 代理
- VITE_APP_PROXY_PREFIX：代理前缀，默认 /api

说明：

- 开发态下，即使这里还是 3000，只要启用了代理，H5 仍会优先按后端运行时端口文件转发
- 小程序不走 Vite 开发代理，而是直接请求配置的 serverBaseUrl

### 后端

后端环境文件目录：

```text
apps/server/env
```

当前关键配置：

- PORT：默认 3000
- GLOBAL_PREFIX：默认 api
- CORS_ORIGIN：默认允许 http://localhost:9000 和 http://127.0.0.1:9000
- DATABASE_URL：默认 mysql://florist:florist123@127.0.0.1:3307/florist?connection_limit=5
- H5_LOGIN_PHONE：H5 测试登录手机号
- H5_LOGIN_CODE：H5 测试登录验证码
- H5_LOGIN_NICKNAME：H5 测试用户昵称

## 登录与测试账号

### H5 登录

H5 当前使用“手机号 + 固定验证码”的开发态登录方案，后端会验证 apps/server/env/.env 中配置的手机号和验证码。

当前测试账号：

- 手机号：15559870086
- 验证码：230318
- 默认昵称：王超

登录成功后会创建或复用一个独立用户，并把后续请求的 x-user-id 自动切换到这个用户。

### 小程序登录

小程序当前前端会调用 uni.login 获取微信临时 code，再发送到后端 /api/auth/wechat/login。

当前状态：

- 前端平台适配已接通
- 后端开发态会基于 code 创建或复用用户
- 还没有接入微信官方 code2Session 生产链路

如果后续要上真机生产环境，需要再补一层服务端调用微信官方接口换取 openid / session_key。

## 认证与请求行为

当前项目不是用浏览器 Cookie 会话来驱动业务接口，而是通过前端持久化用户会话，并在请求头中自动携带：

```text
x-user-id
```

这意味着：

- 未登录时，大部分业务接口会回退到默认本地用户 local-user
- H5 登录成功后，接口会切换到手机号用户
- 小程序登录成功后，接口会切换到微信用户

## 当前已落地的主要模块

后端已具备：

- auth：匿名、本地会话、微信登录、H5 手机验证码登录
- users：当前用户信息管理
- flowers：植株中心、回收站、同步
- records：养护记录、撤回、同步
- members：会员权益
- feedback：反馈与图片
- scheduler：提醒配置与日志
- weather：天气与城市查询
- ai-proxy：AI 中转
- backups：备份状态与手动触发
- admin：极简管理后台

前端已具备：

- 首页花园视图与底部导航
- 记录页与植物医生页
- 我的页面与本地备份
- 自定义分类/状态
- 折叠区与抽屉交互
- AES 本地持久化
- 登录入口与会话切换

## 构建与验证

常用验证命令：

```bash
pnpm typecheck
pnpm build
pnpm --filter @florist/client build:h5
pnpm --filter @florist/client build:mp-weixin
pnpm --filter @florist/server build
```

当前建议至少执行：

- 改前端页面或状态：pnpm --filter @florist/client typecheck
- 改 H5 开发代理、路由、环境变量：pnpm --filter @florist/client build:h5
- 改小程序平台逻辑：pnpm --filter @florist/client build:mp-weixin
- 改后端模块、DTO、服务：pnpm --filter @florist/server build

## 常见问题

### 1. 后端启动后不是 3000

这是正常行为。开发态下如果 3000 被占用，后端会自动切换到下一个空闲端口。

查看当前端口：

```bash
cat apps/server/.runtime/dev-server.json
```

### 2. H5 请求仍然打错端口

先确认：

- 后端是否启动成功
- apps/server/.runtime/dev-server.json 是否存在
- H5 是否走的是 /api 代理，而不是绕过代理直接请求旧地址

### 3. Docker 数据库起不来

如果 Docker Desktop 没启动，`pnpm db:server:up` 会失败。此时直接改用：

```bash
pnpm --filter @florist/server db:local:start
```

### 4. flowers / records 接口超时

先检查：

- 3307 上的 MySQL 是否真的在监听
- 是否执行过 `pnpm db:server:deploy`
- 当前后端是否已重启并连接到正常数据库

### 5. H5 登录成功但页面还是旧数据

当前实现里登录成功后会强制刷新 flowers 和 records；如果你看到的仍是旧数据，优先确认当前请求头中的 x-user-id 是否已经切到新会话用户。

## 相关文档

- docs/architecture.md
- apps/server/README.md
- apps/client/README.md

## 维护说明

当前仓库已经在“可联调、可验证、可继续迭代”的阶段，README 的目标不是展示愿景，而是帮助开发者在本地尽快把整套链路跑起来。

如果你后续继续调整脚本、数据库策略、登录方式或代理逻辑，建议同步更新这一份 README，避免运行说明与代码状态脱节。
