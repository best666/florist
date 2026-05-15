# client 应用说明

这里是养花人前端应用，基于 UniApp + Vue 3 + TypeScript + Pinia + UnoCSS，目标平台为 H5 和微信小程序。

当前前端已经具备可运行的页面、状态管理、接口请求、H5 动态代理、登录入口与本地 AES 持久化能力。

## 当前能力

- 首页花园视图
- 打卡记录页
- 植物医生页
- 我的页面、本地备份与恢复
- 自定义分类与状态
- H5 手机验证码登录入口
- 小程序微信登录入口
- H5 开发态动态代理
- 前端 AES 加密持久化

## 目录边界

```text
apps/client/src
├── api           # 接口入口
├── components    # 复用组件与弹层
├── hooks         # 可复用副作用逻辑
├── interfaces    # 前端通用类型
├── pages         # 页面入口
├── store         # Pinia 状态
└── utils         # request / storage / env / platform 等基础工具
```

## 开发约束

- 仅使用 TypeScript，禁止 any
- 默认只使用 UnoCSS 原子类
- 微信小程序与 H5 差异统一通过条件编译和平台适配层处理
- 请求统一走 src/utils/request.ts
- 本地缓存默认走 AES 加密持久化封装

## 常用命令

在仓库根目录执行：

```bash
pnpm dev:h5
pnpm dev:mp-weixin
pnpm --filter @florist/client typecheck
pnpm --filter @florist/client build:h5
pnpm --filter @florist/client build:mp-weixin
```

## 运行方式

### H5

```bash
pnpm dev:h5
```

默认前端开发端口来自：

```text
apps/client/env/.env
```

当前默认是：

- VITE_APP_PORT=9000

如果 9000 已被占用，Vite 会自动切换到其他可用端口。

### 微信小程序

```bash
pnpm dev:mp-weixin
```

构建完成后导入微信开发者工具即可运行。

## H5 动态代理说明

H5 开发态下，请求默认走 `/api` 代理。

当前代理不是简单写死到 VITE_SERVER_BASEURL，而是会优先读取：

```text
apps/server/.runtime/dev-server.json
```

所以当后端从 3000 自动切到 3001、3002 时，H5 通常不需要手动修改地址。

前提是：

- 后端已启动
- apps/server/.runtime/dev-server.json 存在
- 当前请求走的是 `/api` 代理而不是绕过代理的直连地址

## 环境变量

环境文件目录：

```text
apps/client/env
```

当前关键变量：

- VITE_APP_TITLE=养花人
- VITE_APP_PORT=9000
- VITE_SERVER_BASEURL=http://localhost:3000
- VITE_APP_PROXY_ENABLE=true
- VITE_APP_PROXY_PREFIX=/api
- VITE_STORAGE_AES_KEY=florist-local-storage-key-2026
- VITE_STORAGE_NAMESPACE=florist
- VITE_WX_APPID=wx0000000000000000

说明：

- H5 开发态下即使这里还是 3000，也会优先按后端运行时端口文件转发
- 小程序不走 Vite 开发代理，直接使用配置的 serverBaseUrl

## 登录与会话

### H5

在“我的”页中可以打开手机号验证码登录弹层。

当前是开发态测试账号方案，具体手机号和验证码请以本地服务端 env 配置为准。

登录成功后，前端会：

- 持久化用户会话
- 自动在请求头中携带 x-user-id
- 强制刷新 flowers 和 records

### 微信小程序

在“我的”页中可以触发微信登录。

当前流程：

- 前端调用 uni.login
- 把拿到的 code 发给后端
- 后端开发态按 code 创建或复用用户

## 请求层说明

统一请求封装在：

```text
src/utils/request.ts
```

当前特性包括：

- H5 / 小程序地址适配
- 自动补 x-user-id
- 请求去重
- 超时与重试
- 统一温和提示
- 兼容后端返回的 `code: "OK"`

## 持久化说明

当前前端本地持久化默认使用 AES 加密存储，主要用于：

- Pinia 状态持久化
- 天气与提醒缓存
- 折叠状态
- 登录会话
- 本地备份与恢复

相关基础设施：

- src/utils/storage.ts
- src/utils/auth-session.ts

## 构建与验证

改动后建议至少执行：

```bash
pnpm --filter @florist/client typecheck
```

如果改了 H5 相关配置、代理、环境变量，再执行：

```bash
pnpm --filter @florist/client build:h5
```

如果改了小程序逻辑或条件编译，再执行：

```bash
pnpm --filter @florist/client build:mp-weixin
```

## 常见问题

### 1. H5 请求打到错误后端端口

优先检查：

- 后端是否启动成功
- apps/server/.runtime/dev-server.json 是否存在
- 当前请求是否真的走 `/api`

### 2. H5 登录成功但还是本地用户数据

优先检查：

- 登录后是否已刷新 flowers / records
- 请求头中的 x-user-id 是否已经切换

### 3. 小程序登录按钮点了没反应

优先确认：

- 当前是否真在 mp-weixin 环境
- 微信开发者工具是否正常提供登录能力

### 4. H5 端口不是 9000

如果 9000 被占用，Vite 会自动换端口，这是正常行为。

## 相关文档

- [根 README](README.md)
- [后端 README](apps/server/README.md)
