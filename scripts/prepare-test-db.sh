#!/usr/bin/env bash
# Apply the current schema + RLS policies to the test Postgres on port 5433.
# Idempotent — safe to re-run.

set -euo pipefail

DSN="postgresql://racksmith_test:racksmith_test@localhost:5433/racksmith_test?schema=public"

echo "==> Verifying test DB is reachable…"
docker exec racksmith-db-test psql -U racksmith_test -d racksmith_test \
  -c "SELECT 1" >/dev/null
echo "OK"

echo "==> Applying schema via prisma db push…"
DATABASE_URL="$DSN" DIRECT_URL="$DSN" \
  bunx prisma db push --skip-generate --accept-data-loss

echo "==> Replaying RLS policies (10b create → 10g strict)…"
docker exec -i racksmith-db-test psql -U racksmith_test -d racksmith_test \
  < prisma/migrations/20260419010000_phase_10_rls/migration.sql >/dev/null
docker exec -i racksmith-db-test psql -U racksmith_test -d racksmith_test \
  < prisma/migrations/20260420120000_phase_10g_rls_strict/migration.sql >/dev/null

echo "==> Creating restricted app role (NOSUPERUSER NOBYPASSRLS)…"
docker exec -i racksmith-db-test psql -U racksmith_test -d racksmith_test <<'SQL' >/dev/null
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'racksmith_test_app') THEN
    CREATE ROLE racksmith_test_app WITH LOGIN PASSWORD 'racksmith_test_app'
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO racksmith_test_app;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO racksmith_test_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO racksmith_test_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO racksmith_test_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO racksmith_test_app;
SQL

echo "OK — test DB ready"
