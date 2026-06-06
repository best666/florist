#!/bin/bash
# ==============================================================
# Florist 开发环境一键启动
# 只需 Docker（MySQL），其余全部本地进程
# ==============================================================
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDS=()

cleanup() {
  echo ""
  echo "正在停止所有服务..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  echo "已停止。"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── 1. MySQL ──────────────────────────────────────────
echo "━━━ 1/4 MySQL ━━━"
if docker ps --format '{{.Names}}' | grep -q florist-mysql; then
  echo "  ✅ MySQL 已在运行"
else
  echo "  启动 MySQL Docker..."
  docker compose -f "$ROOT/apps/server/docker-compose.mysql.yml" up -d
  echo "  等待 MySQL 就绪..."
  for i in $(seq 1 15); do
    MYSQL_ROOT_PW="${MYSQL_ROOT_PASSWORD:-changeme}"
    if docker exec florist-mysql mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PW" --silent 2>/dev/null; then
      echo "  ✅ MySQL 已就绪"
      break
    fi
    sleep 2
  done
fi

# ── 2. NestJS 后端 ─────────────────────────────────────
echo "━━━ 2/4 后端 (port 3000) ━━━"
cd "$ROOT/apps/server"
npx nest start &
PIDS+=($!)
sleep 5
echo "  ✅ 后端已启动: http://localhost:3000/api"

# ── 3. AI Agent ────────────────────────────────────────
echo "━━━ 3/4 AI Agent (port 8000) ━━━"
cd "$ROOT/services/ai-agent"
if [ "$NODE_ENV" = "test" ]; then
  MYSQL_DATABASE=florist_test python3 -m app.main &
else
  python3 -m app.main &
fi
PIDS+=($!)
sleep 3
echo "  ✅ AI Agent 已启动: http://localhost:8000"

# ── 4. 前端 ────────────────────────────────────────────
echo "━━━ 4/4 前端 (H5) ━━━"
cd "$ROOT"
if [ "$NODE_ENV" = "test" ]; then
  pnpm run dev:test &
elif [ "$NODE_ENV" = "production" ]; then
  pnpm run build:prod &
else
  pnpm run dev:h5 &
fi
PIDS+=($!)
sleep 5
echo "  ✅ 前端已启动"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  所有服务已启动 🪴"
echo "  前端:    http://localhost:9000"
echo "  后端:    http://localhost:3000/api"
echo "  AI Agent: http://localhost:8000"
echo "  Ctrl+C 停止全部"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 等待任意子进程退出
wait
