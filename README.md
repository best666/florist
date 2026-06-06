# 植愈日记 (Florist) — 养花人的云端花园 🪴

面向养花新手与绿植爱好者的全栈应用。以微信小程序和 H5 为前端载体，配套 NestJS 后端、Python AI Agent 智能体与 MySQL 数据库，支持离线优先的数据同步架构。

## 技术栈

| 层 | 方案 |
|---|---|
| 包管理 | pnpm workspace (monorepo) |
| 前端 | UniApp + Vue 3 + TypeScript + Pinia + UnoCSS |
| 后端 | NestJS 11 + Prisma 7 + MariaDB adapter |
| AI 智能体 | Python FastAPI + ChromaDB + OpenAI/Anthropic |
| 数据库 | MySQL 8.4 |
| 共享层 | packages/contracts（类型、枚举、接口契约） |
| 部署 | Docker Compose + GitHub Actions CI/CD + GHCR |

## 仓库结构

```text
├── apps/
│   ├── client/              UniApp 前端（H5 + 微信小程序）
│   └── server/              NestJS 后端 REST API
├── packages/
│   └── contracts/           前后端共享类型与同步协议
├── services/
│   └── ai-agent/            Python AI 智能体（植物诊断、养护建议、对话）
├── deploy/                  Docker Compose 生产部署配置
├── docs/                    架构文档
└── .github/workflows/       CI/CD 流水线
```

## 环境要求

- Node.js 20+
- pnpm 10.10+
- MySQL 8.x（Docker 或本地二进制）
- Python 3.11+（AI Agent 开发）
- 微信开发者工具（小程序开发）

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

> 安装后会自动执行 `postinstall` 脚本，安装 AI Agent 的 Python 依赖。

### 2. 一键启动（推荐）

```bash
pnpm dev
```

自动启动 MySQL Docker → 后端 → AI Agent → H5 前端，访问 http://localhost:9000。

Ctrl+C 停止全部服务。

### 3. 按需启动

```bash
pnpm dev:db            # Docker 启动 MySQL（端口 3307）
pnpm dev:server        # 后端开发模式（端口 3000，被占用自动切换）
pnpm dev:agent         # AI Agent Python 服务（端口 8000）
pnpm dev:h5            # H5 前端（端口 9000）
pnpm dev:mp-weixin     # 微信小程序开发
```

### 4. 数据库迁移

```bash
pnpm db:deploy                     # 应用迁移到 florist 数据库
pnpm db:init-test                  # 应用迁移到 florist_test 数据库
pnpm --filter @florist/server prisma:migrate:dev   # 从 Schema 变更创建新迁移
```

## 架构概览

### 认证机制

业务接口通过请求头 `x-user-id` 识别用户，不使用 Cookie/JWT 会话：

- **H5 登录**: 手机号 SHA-256 哈希作为跨平台身份标识，开发态使用环境变量配置测试手机号 + 验证码
- **微信小程序**: `uni.login` 获取 code → 后端换取 openid（SHA-256 哈希存储）
- **跨平台账号合并**: `bindPhoneToUser()` → `migrateAndBind()` 事务性迁移数据
- **匿名用户**: 未登录时回退到硬编码 `local-user`（本地花园模式）

### 数据同步

离线优先，**last-writer-wins by `updatedAt`/`createdAt`** 时间戳：

- Pinia stores 使用 AES 加密的 localStorage 持久化
- CRUD 操作始终优先本地执行，网络错误静默回退
- 登录/登出时执行 `refreshGardenContext()` 双向合并
- 批量同步端点: `POST /flowers/sync/batch`, `POST /records/sync/batch`

### AI 智能体三层回退

1. **AI Agent**（Python FastAPI，端口 8000）— 首选，植物知识库 + 向量检索
2. **直连 AI API**（DeepSeek）— Agent 不可用时的备选
3. **本地确定性回退** — 离线时提供中文植物养护建议

结果通过 NestJS `RuntimeCacheService` 缓存，支持可配置 TTL。

### 后端模块

| 模块 | 说明 |
|---|---|
| Auth | H5 手机验证码登录、微信登录、手机绑定、会话管理 |
| Users | 用户资料读写、跨平台账号合并 |
| Flowers | 植株中心 CRUD、软删除、回收站、批量同步 |
| Records | 养护记录 CRUD、5 分钟撤回窗口、批量同步 |
| AiProxy | AI 代理中转（诊断/建议/对话），三层回退 + 缓存 |
| Members | 会员状态管理（当前功能免费/硬编码） |
| Taxonomy | 自定义分类、摆放位置、养护难度、植株状态 |
| Feedback | 社区反馈 + 投票 + 评论 + AI 内容审核 |
| Admin | 管理后台（独立 Cookie 会话，/admin 入口） |
| Backups | AES 加密本地备份与恢复 |
| Scheduler | 提醒配置、推送日志、定时任务 |
| Image | 图片上传 + sharp 压缩裁剪 |
| Weather | 天气查询、城市搜索、反向地理编码 |

### 前端状态管理（6 Pinia stores）

| Store | 职责 |
|---|---|
| app | 运行时平台、网络状态、同步编排 |
| auth | 会话（AES 加密）、登录/登出、`refreshGardenContext()` 合并引擎 |
| flowers | 植株数据 + 回收站、8s 新鲜度节流、离线优先 CRUD |
| records | 养护记录 + 撤回日志、冷却逻辑、5 分钟撤回窗口 |
| member | 会员缓存（当前权益全部硬编码为 true） |
| flowerTaxonomy | 自定义分类 CRUD、默认项显隐控制 |

## 环境变量

### 后端 (`apps/server/env/`)

| 变量 | 说明 | 开发默认值 |
|---|---|---|
| `PORT` | 服务端口 | `3000` |
| `GLOBAL_PREFIX` | API 路径前缀 | `api` |
| `CORS_ORIGIN` | 允许的跨域来源 | `*` |
| `DATABASE_URL` | MySQL 连接串 | `mysql://user:password@127.0.0.1:3307/florist` |
| `H5_LOGIN_PHONE` | H5 测试登录手机号（开发必填） | — |
| `H5_LOGIN_CODE` | H5 测试验证码（开发必填） | — |
| `WECHAT_MINI_PROGRAM_APP_ID` | 小程序 AppID | — |
| `WECHAT_MINI_PROGRAM_SECRET` | 小程序 Secret | — |
| `AI_PROXY_BASE_URL` | AI 服务地址 | `https://api.deepseek.com/v1` |
| `AI_PROXY_API_KEY` | AI 服务 Key | — |
| `AI_AGENT_URL` | AI Agent 地址 | `http://ai-agent:8000` |
| `APP_LOG_LEVELS` | 日志级别过滤 | `log,error,warn,debug,verbose` |

> 复制 `env/.env.example` 为 `env/.env` 后填写真实值。

### 前端 (`apps/client/env/`)

| 变量 | 说明 | 开发默认值 |
|---|---|---|
| `VITE_APP_TITLE` | 应用标题 | `植愈日记` |
| `VITE_SERVER_BASEURL` | 后端地址 | `http://localhost:3000` |
| `VITE_APP_PROXY_ENABLE` | 是否启用 Vite 代理 | `true` |
| `VITE_STORAGE_AES_KEY` | 本地加密密钥 | 开发占位符 |

### AI Agent (`services/ai-agent/.env`)

| 变量 | 说明 |
|---|---|
| `OPENAI_API_KEY` | AI API Key |
| `OPENAI_BASE_URL` | AI API 地址 |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | MySQL 连接 |
| `CHROMA_PERSIST_DIR` | ChromaDB 向量持久化目录 |
| `API_KEY` | Agent 内部 API Key |
| `LOG_LEVEL` | 日志级别（默认 INFO） |

## 常用命令

```bash
# 开发
pnpm dev                    # 一键启动全部服务
pnpm dev:h5                 # H5 前端
pnpm dev:mp-weixin          # 微信小程序
pnpm dev:server             # 后端
pnpm dev:agent              # AI Agent
pnpm dev:db                 # 启动 MySQL Docker

# 构建
pnpm build                  # 构建整个 workspace
pnpm build:prod             # 生产构建前端（压缩 + 去除 console）

# 校验
pnpm typecheck              # 全量 TypeScript 类型检查
pnpm format                 # Prettier 格式化
pnpm format:check           # 检查格式

# 数据库
pnpm db:deploy              # 应用迁移（florist 库）
pnpm db:init-test           # 应用迁移（florist_test 库）

# 单独构建
pnpm --filter @florist/contracts build     # 构建共享类型（server/client 依赖）
pnpm --filter @florist/client build:h5     # H5 构建
pnpm --filter @florist/server build        # 后端构建
```

## 生产部署

### 架构

```
Browser (HTTPS)
    │
    ▼
宿主机 Nginx (port 80/443, SSL via Let's Encrypt)
    │
    ▼
Client 容器 (port 8080 → 80, Nginx)
    │  ├── /            → 前端静态文件
    │  ├── /api/*       → proxy → server:3000
    │  ├── /uploads/*   → proxy → server:3000
    │  └── /admin/*     → proxy → server:3000
    │
    ▼
Server 容器 (port 3000, NestJS)
    │  └── Prisma → MySQL 容器 (port 3306)
    │
    ▼
AI Agent 容器 (port 8000, Python FastAPI)
    └── ChromaDB + SQLite
```

所有服务通过 Docker Compose 管理，内部网络 `florist-internal`（`internal: true`）隔离数据库和 AI Agent，仅 Client 容器同时接入 `florist-public` 和 `florist-internal` 并暴露端口。

### 部署步骤

```bash
# 1. 准备环境文件
cp deploy/.env.example deploy/.env
# 编辑 deploy/.env，填写所有生产环境变量

# 2. 登录 GHCR（需要 GitHub Personal Access Token with packages:read）
echo "$GITHUB_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 3. 部署
cd deploy
IMAGE_TAG=latest sh redeploy.sh
```

### CI/CD（GitHub Actions）

| 事件 | 行为 |
|---|---|
| **PR / push to main**（CI） | 安装依赖 → 构建 contracts → 生成 Prisma → 类型检查 → 构建 Server + Client |
| **Push to main**（CD） | 构建 Docker 镜像（Server / Client / AI Agent）→ 推送 GHCR → SCP 部署文件 → SSH 远程部署 |

镜像托管: `ghcr.io/best666/florist-server` / `florist-client` / `florist-server-agent`

> 国内服务器无法访问 Docker Hub，MySQL 镜像也通过 CI 同步到了 GHCR (`ghcr.io/best666/mysql:8.4`)。

### 服务健康检查

部署后自动执行健康检查：

- Server: `GET /api/health`
- AI Agent: `GET /health`
- Client: `GET /`

## 常见问题

### 后端端口不是 3000

开发态端口被占用会自动切换，查看当前端口：

```bash
cat apps/server/.runtime/dev-server.json
```

H5 前端代理会自动跟随。

### 登录成功但数据未切换

确认请求头 `x-user-id` 已切换到新用户。检查 auth store 的 `hasPendingSyncData` getter。

### Docker 数据库启动失败

改用本地 MySQL 二进制（需要先安装 MySQL 8.x）：

```bash
pnpm --filter @florist/server db:local:start
```

### AI Agent 启动失败

检查 Python 3.11+ 是否安装，以及依赖是否完整：

```bash
cd services/ai-agent && pip install -r requirements.txt
```

### 生产部署后无法访问

1. 检查容器状态: `docker compose -f docker-compose.prod.yml ps`
2. 检查 nginx 配置: `nginx -t`
3. 检查端口监听: `ss -tlnp | grep -E ':(80|443|8080|3000)'`
4. 国内服务器注意 ICP 备案状态和 Let's Encrypt 可访问性

## 相关文档

- [前端 README](apps/client/README.md)
- [后端 README](apps/server/README.md)
- [架构说明](docs/architecture.md)
- [部署配置](deploy/)
