-- Phase 11: Public REST API — ApiKey + ApiRequestLog tables + RLS policies.
-- ApiKey is NON-TENANT scoped (lookup-by-hash happens before org resolution;
-- mirrors the Better Auth Session pattern). ApiRequestLog IS tenant scoped
-- and sits under FORCE RLS like all other tenant tables.

-- ---- ApiKey --------------------------------------------------------
CREATE TABLE "ApiKey" (
  "id"              TEXT PRIMARY KEY,
  "organizationId"  TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "name"            TEXT NOT NULL,
  "prefix"          TEXT NOT NULL,
  "hash"            TEXT NOT NULL UNIQUE,
  "role"            TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt"      TIMESTAMP(3),
  "revokedAt"       TIMESTAMP(3),
  "expiresAt"       TIMESTAMP(3)
);
CREATE INDEX "ApiKey_organizationId_revokedAt_idx"
  ON "ApiKey"("organizationId", "revokedAt");

-- No RLS on ApiKey — global lookup by hash is required. Access control is
-- enforced by (a) key secrecy and (b) subsequent `withTenant` calls after
-- we've resolved organizationId from the key.

-- ---- ApiRequestLog -----------------------------------------------
CREATE TABLE "ApiRequestLog" (
  "id"             TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "apiKeyId"       TEXT NOT NULL REFERENCES "ApiKey"("id") ON DELETE CASCADE,
  "method"         TEXT NOT NULL,
  "path"           TEXT NOT NULL,
  "status"         INTEGER NOT NULL,
  "weight"         INTEGER NOT NULL DEFAULT 1,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ApiRequestLog_apiKeyId_createdAt_idx"
  ON "ApiRequestLog"("apiKeyId", "createdAt");
CREATE INDEX "ApiRequestLog_organizationId_createdAt_idx"
  ON "ApiRequestLog"("organizationId", "createdAt");

ALTER TABLE "ApiRequestLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiRequestLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ApiRequestLog_tenant_isolation" ON "ApiRequestLog"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );
