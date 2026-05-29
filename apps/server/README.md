# 养花人 · 后端

基于 **NestJS + Prisma + MySQL** 的轻量单体模块化后端服务。

## 模块总览

| 模块 | 说明 |
|------|------|
| auth | H5 手机验证码登录、微信小程序登录、会话查询 |
| users | 当前用户资料读取与更新 |
| flowers | 植株中心、回收站、批量同步 |
| records | 养护记录、撤回、批量同步 |
| members | 会员状态与权益管理 |
| image | 头像 / 植株图片上传、裁剪压缩 |
| feedback | 反馈内容与图片收集 |
| scheduler | 提醒配置、提醒日志、定时任务 |
| weather | 城市搜索、反向地理、实时天气 |
| ai-proxy | AI 中转、缓存、配额与请求日志 |
| backups | 备份状态与手动触发 |
| admin | 管理后台（独立 Cookie 会话） |

全局能力：CORS、参数校验、限流、请求追踪、异常日志、响应压缩、AES 加密、开发态端口自动切换。

## 目录结构

```text
apps/server
├── env/                环境变量
├── prisma/             Schema 与迁移文件
├── src/
│   ├── common/         公共装饰器、过滤器、工具
│   ├── config/         环境变量解析与配置
│   └── modules/        业务模块
├── .mysql/             本地 MySQL 数据目录（git 忽略）
└── .runtime/           运行时端口文件（git 忽略）
```

## 快速开始

### 数据库

Docker 方式：

```bash
pnpm --filter @florist/server db:up       # 启动
pnpm --filter @florist/server db:down     # 停止
```

本地 MySQL 二进制（无需 Docker）：

```bash
pnpm --filter @florist/server db:local:start    # 启动（127.0.0.1:3307）
pnpm --filter @florist/server db:local:stop     # 停止
```

启动后自动创建数据库和账号。

### 迁移

```bash
pnpm --filter @florist/server prisma:migrate:deploy   # 执行迁移
pnpm --filter @florist/server prisma:migrate:status    # 查看状态
pnpm --filter @florist/server prisma:generate          # 重新生成客户端
```

### 启动

```bash
pnpm --filter @florist/server start:dev
```

默认目标端口 3000，被占用时自动切换到下一个空闲端口。当前端口写入 `.runtime/dev-server.json`，H5 前端代理自动跟随。

## 环境变量（`apps/server/env/`）

| 变量 | 说明 |
|------|------|
| `PORT` | 服务端口（默认 3000） |
| `GLOBAL_PREFIX` | API 路径前缀（默认 `api`） |
| `CORS_ORIGIN` | 允许的跨域来源 |
| `DATABASE_URL` | MySQL 连接串 |
| `H5_LOGIN_PHONE` | H5 测试登录手机号 |
| `H5_LOGIN_CODE` | H5 测试验证码 |
| `H5_LOGIN_NICKNAME` | H5 默认昵称（留空则自动生成花名） |
| `WECHAT_MINI_PROGRAM_APP_ID` | 小程序 AppID（生产必填） |
| `WECHAT_MINI_PROGRAM_SECRET` | 小程序 Secret（生产必填） |
| `AI_PROXY_BASE_URL` | AI 服务地址 |
| `AI_PROXY_API_KEY` | AI 服务 Key |

> 复制 `env/.env.example` 为 `env/.env` 后填写真实值。示例文件中均为占位符。

## 认证机制

业务接口通过请求头 `x-user-id` 识别用户，不使用 Cookie 会话。

### H5 登录

开发态采用"测试手机号 + 验证码"方案，不依赖短信平台。登录时后端验证 `H5_LOGIN_PHONE` 和 `H5_LOGIN_CODE`，成功则创建或复用用户。

昵称规则：微信昵称 > 请求传入昵称 > `H5_LOGIN_NICKNAME` > 自动生成双段随机花名。

### 微信小程序

前端调用 `uni.login` 获取 code，发送至 `POST /api/auth/wechat/login`：
- 生产态：调用微信官方 `code2Session` 换取 openid
- 开发态：未配置 AppID/Secret 时回退到基于 code 的本地联调链路

## 会员与上传

会员开通接口在开发阶段为直开通链路（未接入第三方支付）。图片上传使用 sharp 裁剪压缩后存入本地 uploads 目录，avatar 可全员上传，flower/record scope 仅对会员开放。

## 管理后台

入口 `/admin`，接口 `/api/admin/*`，使用独立 HttpOnly Cookie 会话，与业务端 `x-user-id` 机制分离。

## 常用命令

```bash
pnpm --filter @florist/server start:dev              # 开发启动
pnpm --filter @florist/server build                  # 生产构建
pnpm --filter @florist/server prisma:migrate:deploy  # 执行迁移
pnpm --filter @florist/server prisma:generate        # 生成 Prisma 客户端
```

## 常见问题

### 数据库连接失败

检查 MySQL 是否在 3307 端口监听，是否已执行迁移。

### 登录验证失败

检查 `H5_LOGIN_PHONE` / `H5_LOGIN_CODE` 是否与环境变量一致。

### 端口不是 3000

查看 `apps/server/.runtime/dev-server.json` 获取实际端口，前端代理会自动跟随。

## 相关文档

- [根 README](../../README.md)
- [前端 README](../client/README.md)
