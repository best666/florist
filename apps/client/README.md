# 养花人 · 前端

基于 **UniApp + Vue 3 + TypeScript + Pinia + UnoCSS** 的跨端花卉养护应用前端，目标平台为 H5 和微信小程序。

## 功能概览

- 花园首页 — 植株卡片网格、筛选、快捷创建
- 养护打卡 — 浇水 / 施肥 / 修剪等动作记录，时间轴回看，冷却期内撤回
- 植物医生 — AI 病虫害识别、出差养护方案、天气联动
- 成长相册 — 植株照片汇总、时间线节点、海报生成保存
- 皮肤主题 — 6 套莫兰迪色系全局配色，即时切换
- 我的页面 — 会员中心、备份恢复、权限通知、回收站、反馈收集
- 极简商城 — 外链种草入口，不做站内交易
- 登录体系 — H5 手机验证码 / 小程序微信登录
- 本地安全 — AES 加密持久化，离线可用

## 目录结构

```text
apps/client/src
├── api/            接口请求层
├── components/     复用组件与弹层
├── hooks/          可复用副作用逻辑（composables）
├── interfaces/     前端类型定义
├── pages/          页面入口（10 个页面）
├── store/          Pinia 状态管理
├── styles/         全局样式与主题变量
└── utils/          请求 / 存储 / 平台 / 加密等基础工具
```

## 技术栈

| 类别 | 方案 |
|------|------|
| 框架 | UniApp (Vue 3 Composition API) |
| 语言 | TypeScript（禁止 any） |
| 状态管理 | Pinia + 持久化插件 |
| CSS | UnoCSS（原子类）+ CSS 变量 |
| 构建 | Vite |
| 加密 | AES 本地加密存储 |
| 条件编译 | `#ifdef` / `#ifndef` 处理双端差异 |

## 开发约束

- 默认只使用 UnoCSS 原子类，不写自定义 CSS（全局变量和动画除外）
- H5 / 小程序差异通过条件编译和平台适配统一处理，禁止硬编码判断
- 请求统一走 `src/utils/request.ts`
- 本地缓存走 AES 加密持久化封装
- 组件遵循单职责原则，入口 / 路由页面保持编排层薄

## 快速开始

在仓库根目录执行：

```bash
pnpm dev:h5            # H5 开发（默认 http://localhost:9000）
pnpm dev:mp-weixin     # 微信小程序开发
```

### H5

端口配置在 `apps/client/env/.env` 中，默认 9000。端口被占用时 Vite 自动切换。

H5 开发态请求走 `/api` 代理，代理目标动态读取 `apps/server/.runtime/dev-server.json`，后端端口变化时无需手动修改。

### 微信小程序

构建后将 `dist/build/mp-weixin` 导入微信开发者工具即可运行。需在 `manifest.json` 中配置正确的小程序 AppID。

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_APP_TITLE` | 应用标题 |
| `VITE_APP_PORT` | H5 开发端口 |
| `VITE_SERVER_BASEURL` | 服务端地址（含 /api 前缀） |
| `VITE_APP_PROXY_ENABLE` | H5 代理开关 |
| `VITE_APP_PROXY_PREFIX` | 代理路径前缀 |
| `VITE_STORAGE_AES_KEY` | 本地加密密钥（需替换为自定义值） |
| `VITE_STORAGE_NAMESPACE` | 本地存储命名空间 |
| `VITE_WX_APPID` | 微信小程序 AppID |

> 完整示例见 `apps/client/env/.env.example`，复制为 `.env` 后替换占位值。

## 皮肤主题

6 套莫兰迪色系主题（奶油晨光、青苔温室、桃雾露台、林间信笺、琥珀清晨、月影夜棚），通过 CSS 变量驱动。

- **实现**：主题色值定义在 `src/utils/member.ts`（JS 端）和 `src/styles/global.css`（CSS 端），`.theme-*` 类切换完成全局颜色替换
- **机制**：每个页面通过 `usePageTheme()` composable 将主题 class 绑定到根元素，H5 端额外通过 DOM 注入 CSS 变量到 `uni-page-body`
- **切换**：`memberStore.setTheme()` 更新 Pinia 状态，`useTheme` composable 监听变化自动同步原生导航栏和页面背景

## 常用命令

```bash
pnpm --filter @florist/client typecheck     # TypeScript 类型检查
pnpm --filter @florist/client build:h5      # H5 生产构建
pnpm --filter @florist/client build:mp-weixin  # 小程序生产构建
```

改动后建议至少执行一次 `typecheck`，涉及多端逻辑时同时验证双端构建。

## 请求层

`src/utils/request.ts` 提供统一的网络请求封装：

- H5 / 小程序地址自动适配
- 自动注入 `x-user-id` 请求头
- 请求去重、超时重试
- 统一温和错误提示
- 兼容后端 `code: "OK"` 返回格式

## 持久化

使用 AES 加密的本地持久化，覆盖：

- Pinia 状态（会员、主题偏好）
- 植物、打卡等业务数据
- 天气与提醒缓存
- 登录会话令牌
- 本地备份与恢复

核心模块：`src/utils/storage.ts`、`src/utils/auth-session.ts`

## 登录与会话

### H5

手机号验证码登录。开发阶段使用服务端 env 配置的测试账号，登录后前端自动切换 `x-user-id` 并刷新业务数据。

### 微信小程序

调用 `uni.login` 获取临时 code 发送至后端完成用户识别，登录流程与 H5 共享同一会话管理。

## 常见问题

### H5 请求打到错误后端端口

检查后端是否启动、`apps/server/.runtime/dev-server.json` 是否存在、请求是否走 `/api` 代理。

### 小程序登录无反应

确认当前在 `mp-weixin` 环境，微信开发者工具登录能力正常。

### 主题切换后边距丢失

确认页面根元素已通过 `usePageTheme()` 绑定主题 class，且 `global.css` 中 `.theme-*` 类包含结构变量。

## 相关文档

- [根 README](../../README.md)
- [后端文档](../server/README.md)
