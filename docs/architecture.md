# 植愈日记 工程架构说明

## 1. Monorepo 分层原则

- `apps/` — 可运行应用，不放跨端复用逻辑
- `packages/` — 共享类型、同步协议和接口契约，不承载运行时状态
- `services/` — 独立服务（AI Agent 智能体），独立于前后端的运行时
- 后端采用单体模块化，避免个人开发阶段过早拆分微服务
- 前端严格双端适配，平台差异通过条件编译（`#ifdef` / `#ifndef`）承接

## 2. 后端模块边界

| 模块 | 职责 | 关键特性 |
|---|---|---|
| health | 健康检查与基础可观测性 | Docker healthcheck 集成 |
| auth | 认证与会话管理 | H5 手机验证码、微信登录、跨平台账号合并 |
| users | 用户资料 | 默认 local-user 回退、跨平台身份合并 |
| flowers | 植株管理 | CRUD、软删除、回收站、批量同步 |
| records | 养护记录 | CRUD、5 分钟撤回窗口、批量同步 |
| ai-proxy | AI 请求代理 | 三层回退（Agent → 直连 API → 本地回退）、缓存、配额 |
| members | 会员管理 | 状态缓存（当前功能免费/硬编码） |
| taxonomy | 自定义分类 | 分类、摆放位置、养护难度、植株状态 |
| feedback | 社区反馈 | 反馈收集、投票、评论、AI 内容审核 |
| admin | 管理后台 | 独立 Cookie 会话（HMAC 签名）、/admin 入口 |
| backups | 备份恢复 | AES 加密本地备份 |
| scheduler | 定时任务 | 提醒配置、推送日志 |
| image | 图片处理 | 上传 + sharp 压缩裁剪 |
| weather | 天气服务 | 城市搜索、反向地理编码、天气缓存 |

## 3. 前端目录边界

| 目录 | 职责 |
|---|---|
| pages/ | 页面级入口，编排层保持薄 |
| components/ | 可复用展示组件 |
| api/ | 接口请求封装层 |
| hooks/ | 可复用 composables |
| store/ | Pinia 状态管理（6 个 store） |
| utils/ | 请求、加密、存储、平台适配等基础工具 |
| styles/ | 全局样式与主题 CSS 变量 |
| interfaces/ | 前端本地补充类型（优先复用 contracts） |

## 4. AI Agent 智能体架构

```
services/ai-agent/
├── app/
│   ├── main.py              FastAPI 应用入口
│   ├── config.py            配置管理（pydantic-settings）
│   ├── api/                 REST API 路由层
│   │   ├── router.py        路由聚合
│   │   ├── advice.py        养护建议
│   │   ├── diagnosis.py     病虫害诊断
│   │   ├── chat.py          AI 对话
│   │   ├── tools_api.py     Tool 注册 API
│   │   └── deps.py          依赖注入（API Key 验证、Agent 实例）
│   ├── agent/               AI Agent 核心
│   │   ├── engine.py        Agent 引擎
│   │   ├── runner.py        执行编排
│   │   ├── compressor.py    上下文压缩
│   │   ├── types.py         Agent 类型定义
│   │   └── system_prompt.py 系统提示词
│   ├── tools/               Agent 工具集
│   │   ├── registry.py      工具注册中心
│   │   ├── plants.py        植物知识检索
│   │   ├── advice.py        养护建议生成
│   │   ├── diagnosis.py     病虫害识别
│   │   ├── weather.py       天气查询
│   │   └── moderation.py    内容审核
│   ├── memory/              记忆系统
│   │   ├── db.py            SQLite 记忆存储
│   │   ├── retrieval.py     记忆检索
│   │   ├── importance.py    重要性评分
│   │   └── consolidation.py 记忆整合
│   ├── security/            安全层
│   │   ├── content_filter.py   内容过滤
│   │   ├── prompt_defense.py   提示词防御
│   │   ├── sanitizer.py       输入清洗
│   │   └── rate_limiter.py    速率限制
│   └── constants/           枚举与常量
└── data/                    运行时数据（ChromaDB、SQLite）
```

## 5. 数据流

```
用户操作 → Pinia Store（本地 AES 加密持久化）
                │
                ├── 离线：直接返回，标记待同步
                │
                └── 在线：POST /api/*（x-user-id header）
                              │
                              ▼
                     NestJS Controller
                              │
                              ▼
                     PrismaService（MariaDB adapter）
                              │
                              ▼
                          MySQL 8.4
```

### 同步策略

- **离线优先**：所有写操作优先更新本地 Pinia store，网络错误静默回退
- **双向合并**：登录/登出时执行 `refreshGardenContext()`，按 `updatedAt`/`createdAt` 时间戳比较，last-writer-wins
- **批量同步**：`/flowers/sync/batch`、`/records/sync/batch` 端点接收批量数据
- **冲突处理**：以后端时间戳为准，前端收到响应后覆盖本地

## 6. 安全约束

- 业务 API 使用 `x-user-id` header 识别用户，不使用 Cookie/JWT
- 敏感字段（手机号、OpenID）在数据库以 AES-256-GCM 加密存储
- 前端 localStorage 全部 AES 加密
- AI API Key 仅后端保管，前端不接触
- 管理后台使用 HMAC 签名的独立 HttpOnly Cookie 会话
- 生产环境 `EXPOSE_INTERNAL_ERROR_DETAILS=false` 不暴露内部错误详情

## 7. 当前技术约束

- TypeScript 严格模式默认开启，禁止 `any`
- 样式仅允许 UnoCSS 原子类，禁止自定义 CSS/SCSS/LESS（全局变量和动画除外）
- 实体 ID 格式：`{prefix}-{timestamp}-{random8chars}`（如 `usr-lz4x8k2y-a1b2c3d4`）
- 所有隐私数据按加密存储设计
- 数据流必须支持本地持久化、云端备份、回滚恢复

## 8. 生产部署架构

见 [deploy/](../deploy/) 目录，Docker Compose 四容器部署：

```
Browser (HTTPS) → 宿主机 Nginx → Client 容器 (8080:80)
                                     │
                                     ├── /api/* → Server 容器 (3000)
                                     │                └── MySQL 容器 (3306)
                                     │
                                     └── 前端静态文件

                              AI Agent 容器 (8000)
                              └── ChromaDB + SQLite
```

服务间通过 Docker 内部网络 `florist-internal`（`internal: true`）通信，仅 Client 容器暴露端口到宿主机。
