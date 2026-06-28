#!/bin/sh
set -eu

if [ ! -f .env ]; then
  echo "Missing deploy/.env. Copy deploy/.env.example to deploy/.env and fill production values first."
  exit 1
fi

# 保存 CD workflow 传入的 SHA 版本标签，防止被 .env 中的 IMAGE_TAG=latest 覆盖
_IMAGE_TAG="$IMAGE_TAG"
set -a
. ./.env
set +a
# CD workflow 传入的 SHA 标签优先；手动执行时回退到 .env 中的值
IMAGE_TAG="${_IMAGE_TAG:-$IMAGE_TAG}"

docker compose --env-file .env -f docker-compose.prod.yml config >/dev/null
docker compose --env-file .env -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.prod.yml up -d --remove-orphans

# 部署后验证服务健康状态
# Server 和 AI Agent 在 Docker 内部网络中，端口不对宿主机暴露，
# 因此通过 docker compose exec 在容器内执行检查
HEALTH_MAX_WAIT_SECONDS=60
HEALTH_CHECK_INTERVAL=2
API_PREFIX="${GLOBAL_PREFIX:-api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

echo ""
echo "--- Verifying deployment health (parallel) ---"

check_container_health() {
  local label="$1"
  local service="$2"
  local check_cmd="$3"
  local elapsed=0

  while [ "$elapsed" -lt "$HEALTH_MAX_WAIT_SECONDS" ]; do
    if docker compose -f "$COMPOSE_FILE" exec -T "$service" sh -c "$check_cmd" 2>/dev/null; then
      echo "  ✓ $label is healthy"
      return 0
    fi
    sleep "$HEALTH_CHECK_INTERVAL"
    elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
  done

  echo "  ✗ $label FAILED health check after ${HEALTH_MAX_WAIT_SECONDS}s"
  return 1
}

check_http_health() {
  local label="$1"
  local url="$2"
  local elapsed=0

  while [ "$elapsed" -lt "$HEALTH_MAX_WAIT_SECONDS" ]; do
    if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 --max-time 5 "$url" 2>/dev/null | grep -qE '^2'; then
      echo "  ✓ $label is healthy ($url)"
      return 0
    fi
    sleep "$HEALTH_CHECK_INTERVAL"
    elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
  done

  echo "  ✗ $label FAILED health check after ${HEALTH_MAX_WAIT_SECONDS}s ($url)"
  return 1
}

# 并行检查所有服务健康状态，最坏 60s 完成全部（而非串行的 180s）
CLIENT_PORT="${CLIENT_HTTP_PORT:-8080}"
TMP_DIR=$(mktemp -d)
FAILED=0

check_container_health "Server" "server" \
  "node -e \"fetch('http://127.0.0.1:3000/${API_PREFIX}/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))\"" > "$TMP_DIR/server.log" 2>&1 &
PID_SRV=$!

check_container_health "AI Agent" "ai-agent" \
  "wget -q -O - http://127.0.0.1:8000/health 2>/dev/null || python3 -c \"import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')\"" > "$TMP_DIR/agent.log" 2>&1 &
PID_AGENT=$!

check_http_health "Client" "http://127.0.0.1:${CLIENT_PORT}/" > "$TMP_DIR/client.log" 2>&1 &
PID_CLI=$!

wait $PID_SRV || { cat "$TMP_DIR/server.log"; FAILED=1; }
wait $PID_AGENT || { cat "$TMP_DIR/agent.log"; FAILED=1; }
wait $PID_CLI || { cat "$TMP_DIR/client.log"; FAILED=1; }

rm -rf "$TMP_DIR"

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "!!! Deployment health check failed. Check logs with:"
  echo "    docker compose -f docker-compose.prod.yml logs --tail 50"
  echo "    Old images preserved for manual rollback."
  exit 1
fi

echo ""
echo "All services healthy. Deployment successful."

# 仅在成功部署后清理，确保失败时旧镜像可用于回滚
# 注意：仅清理无标签的悬空镜像（dangling），不删除其他项目的未使用镜像
echo ""
echo "--- Cleaning up Docker disk space ---"
docker image prune -f
docker builder prune -f
