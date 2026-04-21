#!/bin/sh
set -e

# ── wait for postgres ──────────────────────────────────────────────
# Extract host:port from DATABASE_URL (postgresql://user:pass@host:port/db)
DB_HOST_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^/]*\)/.*|\1|p')
DB_HOST=$(echo "$DB_HOST_PORT" | cut -d: -f1)
DB_PORT=$(echo "$DB_HOST_PORT" | cut -d: -f2)
DB_PORT=${DB_PORT:-5432}

if [ -n "$DB_HOST" ]; then
  echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
  attempts=0
  max_attempts=60
  until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
    attempts=$((attempts + 1))
    if [ $attempts -ge $max_attempts ]; then
      echo "PostgreSQL did not become ready after ${max_attempts}s, giving up." >&2
      exit 1
    fi
    sleep 1
  done
  echo "PostgreSQL is up."
fi

# ── run migrations ──────────────────────────────────────────────────
echo "Applying Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy

# ── optional seed ───────────────────────────────────────────────────
if [ "$RACKSMITH_SEED" = "1" ] || [ "$RACKSMITH_SEED" = "true" ]; then
  echo "Seeding device catalog..."
  node node_modules/prisma/build/index.js db seed || echo "Seed step failed (ignoring — may already be seeded)."
fi

# ── start app ───────────────────────────────────────────────────────
echo "Starting RackSmith..."
exec "$@"
