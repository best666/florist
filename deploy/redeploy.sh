#!/bin/sh
set -eu

if [ ! -f .env ]; then
  echo "Missing deploy/.env. Copy deploy/.env.example to deploy/.env and fill production values first."
  exit 1
fi

docker compose --env-file .env -f docker-compose.prod.yml config >/dev/null
docker compose --env-file .env -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.prod.yml up -d --remove-orphans
docker image prune -af --filter 'until=168h'
