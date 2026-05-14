# server 应用说明

这里是养花人后端服务，基于 NestJS + Prisma + MySQL，采用轻量单体模块化结构。当前已经不是单纯脚手架，而是可以直接支撑前后端本地联调的服务端应用。

## 当前能力

- auth：H5 手机验证码登录、微信小程序登录、会话查询、强制登录态支撑
- users：当前用户资料读取与更新
- flowers：植株中心、回收站、批量同步
- records：养护记录、撤回、批量同步
- members：会员状态与权益
- image：头像、植物图片、记录图片上传与裁剪压缩
- feedback：反馈内容与图片
- scheduler：提醒配置、提醒日志、定时任务
- weather：城市搜索、反向地理、当前天气
- ai-proxy：AI 中转、缓存、配额与请求日志
- backups：备份状态与手动触发
- admin：极简管理后台

全局能力：

- CORS
- 请求参数校验
- 限流
- 请求追踪与异常日志
- 响应压缩
- 敏感字段 AES 加密
- 开发态端口自动切换

## 目录边界

```text
apps/server
├── env                     # 环境变量
├── prisma                  # Prisma schema 与 migrations
├── src
│   ├── common              # 公共装饰器、过滤器、服务、工具
│   ├── config              # 环境变量解析
│   └── modules             # 业务模块
├── .mysql                  # 本地 MySQL 数据目录（git 忽略）
└── .runtime                # 运行时端口文件（git 忽略）
```

## 常用命令

在仓库根目录执行：

```bash
pnpm --filter @florist/server start:dev
pnpm --filter @florist/server build
pnpm --filter @florist/server build:prod
pnpm --filter @florist/server prisma:generate
pnpm --filter @florist/server prisma:migrate:deploy
pnpm --filter @florist/server prisma:migrate:status
pnpm --filter @florist/server db:up
pnpm --filter @florist/server db:down
pnpm --filter @florist/server db:local:start
pnpm --filter @florist/server db:local:stop
```

## 数据库启动方式

### 方式 A：Docker MySQL

```bash
pnpm --filter @florist/server db:up
```

停止：

```bash
pnpm --filter @florist/server db:down
```

### 方式 B：本地 MySQL 二进制

```bash
pnpm --filter @florist/server db:local:start
```

这个命令会：

- 初始化 apps/server/.mysql/data
- 在 127.0.0.1:3307 启动本地 MySQL
- 自动创建 florist 数据库和 florist 账号

停止：

```bash
pnpm --filter @florist/server db:local:stop
```

默认数据库信息：

- 数据库名：florist
- 用户名：florist
- 密码：florist123
- 主机地址：127.0.0.1
- 端口：3307

## Prisma 与迁移

数据库可用后，先执行：

```bash
pnpm --filter @florist/server prisma:migrate:deploy
```

查看迁移状态：

```bash
pnpm --filter @florist/server prisma:migrate:status
```

修改 schema 后如果需要重新生成客户端：

```bash
pnpm --filter @florist/server prisma:generate
```

## 启动与端口行为

开发态启动：

```bash
pnpm --filter @florist/server start:dev
```

默认目标端口是 3000。

如果 3000 被占用，服务会自动切换到 3001、3002 等空闲端口，不会直接启动失败。当前实际端口会写入：

```text
apps/server/.runtime/dev-server.json
```

示例内容：

```json
{
	"pid": 11817,
	"port": 3000,
	"origin": "http://127.0.0.1:3000"
}
```

这个文件会被前端 H5 开发代理读取，所以后端切端口后，前端通常不需要手改地址。

## 环境变量

环境文件目录：

```text
apps/server/env
```

当前关键变量：

- PORT
- GLOBAL_PREFIX
- CORS_ORIGIN
- DATABASE_URL
- AI_PROXY_BASE_URL
- AI_PROXY_API_KEY
- H5_LOGIN_PHONE
- H5_LOGIN_CODE
- H5_LOGIN_NICKNAME

当前本地 H5 登录测试配置：

- H5_LOGIN_PHONE=15559870086
- H5_LOGIN_CODE=230318
- H5_LOGIN_NICKNAME=王超

## 认证机制说明

当前业务接口不是基于浏览器 Cookie 会话，而是通过请求头中的 x-user-id 识别当前用户。

这意味着：

- 前端未登录时会被全局登录拦截，核心业务流程不会继续进入
- H5 手机验证码登录成功后，接口会切换到手机号用户
- 小程序微信登录成功后，接口会切换到微信用户
- 会员云端植物、云端记录、成长相册上传等接口会额外校验 CloudBackup 权益

当前登录接口：

- POST /api/auth/h5/phone/login
- POST /api/auth/wechat/login
- GET /api/auth/session

## 开发态登录说明

### H5

H5 当前是开发态“固定手机号 + 固定验证码”方案，不依赖短信平台。

测试账号：

- 手机号：15559870086
- 验证码：230318

### 微信小程序

小程序前端已经调用 uni.login 获取微信临时 code，再请求 /api/auth/wechat/login。

当前后端仍是开发态基于 code 创建或复用用户，还没有接入微信官方 code2Session 生产链路。

## 会员与上传说明

当前会员开通接口在开发阶段仍是后端直开通：

- 前端提交套餐和渠道后，后端直接更新会员状态并返回最新会员信息
- 这条链路用于联调会员权限，暂未接入第三方支付下单和支付回调

当前图片上传处理规则：

- avatar scope 允许登录用户上传头像
- flower 和 record scope 仅会员可上传
- 后端会使用 sharp 对图片进行裁剪、压缩，再写入本地 uploads 目录

## 管理后台

管理后台入口：

```text
/admin
```

相关接口：

```text
/api/admin/*
```

管理后台使用独立的 HttpOnly Cookie 会话，和业务端 x-user-id 机制不是一套系统。

## 构建与验证

推荐命令：

```bash
pnpm --filter @florist/server build
```

如果改了数据库相关逻辑，再补：

```bash
pnpm --filter @florist/server prisma:migrate:status
```

## 常见问题

### 1. db:up 失败

大概率是 Docker daemon 没启动。此时直接改用：

```bash
pnpm --filter @florist/server db:local:start
```

### 2. flowers / records 接口超时

优先检查：

- 3307 端口是否有 MySQL 在监听
- 是否执行过 prisma:migrate:deploy
- 后端是否在数据库恢复后重启过

### 3. 后端端口不是 3000

查看：

```bash
cat apps/server/.runtime/dev-server.json
```

### 4. H5 手机验证码登录失败

优先检查 apps/server/env/.env 中的：

- H5_LOGIN_PHONE
- H5_LOGIN_CODE

## 相关文档

- [根 README](README.md)
- [架构说明](docs/architecture.md)
