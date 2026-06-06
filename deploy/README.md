# 生产部署

Florist 采用 Docker Compose 单机四容器部署，所有镜像托管在 GitHub Container Registry (GHCR)。

## 架构

| 服务 | 镜像 | 端口 | 网络 |
|---|---|---|---|
| MySQL | `ghcr.io/best666/mysql:8.4` | 3306（内部） | florist-internal |
| Server (NestJS) | `ghcr.io/best666/florist-server` | 3000（内部） | florist-internal |
| AI Agent (Python) | `ghcr.io/best666/florist-server-agent` | 8000（内部） | florist-internal |
| Client (Nginx + H5) | `ghcr.io/best666/florist-client` | 80 → 宿主机 `${CLIENT_HTTP_PORT}` | florist-public + florist-internal |

```
Browser → 宿主机 Nginx (80/443, SSL) → Client 容器 (8080:80)
                                          ├── /         静态文件
                                          ├── /api/*    → Server:3000
                                          ├── /uploads/* → Server:3000
                                          └── /admin/*  → Server:3000
                    Server:3000 → MySQL:3306
                    Server:3000 → AI Agent:8000
```

## 文件说明

| 文件 | 用途 |
|---|---|
| `docker-compose.prod.yml` | Docker Compose 生产部署定义 |
| `redeploy.sh` | 一键部署脚本（pull + up + health check） |
| `.env.example` | 环境变量模板 |
| `.env` | 实际环境变量（git 忽略，不可提交） |
| `default.conf` | Nginx 配置（客户端容器使用，可选） |

## 部署流程

### 1. 准备环境变量

```bash
cp .env.example .env
# 编辑 .env，填写所有 `replace-with-*` 占位符
```

关键变量：
- `SERVER_IMAGE` / `CLIENT_IMAGE`: GHCR 镜像路径（需替换 GitHub 用户名）
- `MYSQL_IMAGE`: 国内服务器使用 `ghcr.io/xxx/mysql:8.4`
- `CLIENT_HTTP_PORT`: 客户端容器暴露端口（如 `8080`，避免与宿主机 80 冲突）
- `CORS_ORIGIN` / `PUBLIC_BASE_URL`: 替换为实际域名

### 2. 登录 GHCR

```bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

需要 GitHub Personal Access Token (classic)，权限勾选 `read:packages`。

### 3. 执行部署

```bash
IMAGE_TAG=latest sh redeploy.sh
```

脚本流程：
1. 校验配置完整性
2. 拉取最新镜像
3. 启动/更新容器
4. 健康检查（Server / AI Agent / Client）
5. 成功后清理 7 天前的旧镜像

### 4. 配置宿主机 Nginx

```nginx
# /etc/nginx/conf.d/florist.conf
server {
    listen 80;
    server_name florist.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10m;
}
```

> SSL 证书推荐通过 Certbot（Let's Encrypt）自动管理。

## CI/CD

GitHub Actions 在 push 到 main 分支时自动：

1. 构建 Server / Client / AI Agent 三个 Docker 镜像
2. 推送至 `ghcr.io/<owner>/florist-*`（同时打 `latest` 和 `$GITHUB_SHA` 标签）
3. SCP 部署文件至服务器
4. SSH 执行 `redeploy.sh`

国内服务器特殊处理：
- MySQL 镜像在 CI 中从 Docker Hub 拉取后推送至 GHCR（避免服务器无法访问 Docker Hub）
- pnpm 通过 Dockerfile `COPY --from=build /pnpm` 预置（避免 Corepack 下载失败）
- `docker-entrypoint.sh` 使用 `npx prisma migrate deploy`（无需 pnpm）

## 健康检查

部署后自动验证：

```bash
curl http://127.0.0.1:3000/api/health     # Server
curl http://127.0.0.1:8000/health          # AI Agent
curl http://127.0.0.1:8080/                # Client
```

## 常见问题

### 容器启动失败

```bash
docker compose -f docker-compose.prod.yml logs --tail 50
```

### 端口被占用

修改 `.env` 中的 `CLIENT_HTTP_PORT`，同时更新宿主机 Nginx 的 `proxy_pass` 端口。

### 镜像拉取失败

国内服务器无法访问 Docker Hub，确保 `.env` 中所有镜像地址均指向 GHCR。

### 数据库迁移失败

```bash
docker compose -f docker-compose.prod.yml run --rm --entrypoint "" server npx prisma migrate deploy
```

### 手动回滚

```bash
IMAGE_TAG=<previous-commit-sha> sh redeploy.sh
```
