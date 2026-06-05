#!/bin/sh
set -eu

if [ ! -f .env ]; then
  echo "Missing deploy/.env. Copy deploy/.env.example to deploy/.env and fill production values first."
  exit 1
fi

# 加载环境变量用于 health check
set -a
. ./.env
set +a

docker compose --env-file .env -f docker-compose.prod.yml config >/dev/null
docker compose --env-file .env -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.prod.yml up -d --remove-orphans

# 部署后验证服务健康状态
HEALTH_MAX_WAIT_SECONDS=60
HEALTH_CHECK_INTERVAL=2
API_PREFIX="${GLOBAL_PREFIX:-api}"

echo ""
echo "--- Verifying deployment health ---"

check_health() {
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

FAILED=0

check_health "Server" "http://127.0.0.1:3000/${API_PREFIX}/health" || FAILED=1
check_health "AI Agent" "http://127.0.0.1:8000/health" || FAILED=1
check_health "Client" "http://127.0.0.1:80/" || FAILED=1

docker image prune -af --filter 'until=168h'

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "!!! Deployment health check failed. Check logs with:"
  echo "    docker compose -f docker-compose.prod.yml logs --tail 50"
  exit 1
fi

echo ""
echo "All services healthy. Deployment successful."
