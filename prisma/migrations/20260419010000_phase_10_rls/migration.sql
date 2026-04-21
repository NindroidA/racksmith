-- Phase 10b: Row-Level Security (compatibility mode)
-- ============================================================================
-- Adds RLS policies to the 13 tenant-scoped tables. Policies key off two
-- session variables:
--
--   app.organization_id  — set by src/lib/prisma-tenant.ts:withTenant()
--   app.role             — set by src/lib/prisma-admin.ts:withAdmin()
--
-- **Compatibility mode**: when `app.organization_id` is unset (NULL) the
-- policy allows access. This lets pre-10b action code keep working while
-- the action-refactor pass migrates callers to `withTenant`. Once every
-- call site wraps writes in `withTenant`, a follow-up migration tightens
-- the policy to reject unset-session-variable access (remove the NULL
-- short-circuit).
--
-- The `app.role = 'admin'` short-circuit exists for legitimate admin
-- operations (seeds, cron jobs, migrations) via `withAdmin`. Every
-- import of `prisma-admin` is a code-review touchpoint — the file's
-- JSDoc lists the exhaustive call sites.
--
-- Organization / Member / Invitation are NOT under RLS: they're the
-- directory tables used to resolve tenancy itself, and must be readable
-- across orgs (e.g. a user's memberships list spans their orgs).
-- ============================================================================

-- Helper predicate — inlined into each policy so we don't need a custom
-- function (avoids privilege-grant bikeshedding).
--
--   current_setting('app.role', true) = 'admin'
--     OR coalesce(current_setting('app.organization_id', true), '') = ''
--     OR "organizationId" = current_setting('app.organization_id', true)

-- ---- Rack --------------------------------------------------------
ALTER TABLE "Rack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rack" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Rack_tenant_isolation" ON "Rack"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );

-- ---- Device -----------------------------------------------------
ALTER TABLE "Device" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Device" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Device_tenant_isolation" ON "Device"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );

-- ---- Subnet -----------------------------------------------------
ALTER TABLE "Subnet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subnet" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Subnet_tenant_isolation" ON "Subnet"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );

-- ---- IpAssignment -----------------------------------------------
ALTER TABLE "IpAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IpAssignment" FORCE ROW LEVEL SECURITY;
CREATE POLICY "IpAssignment_tenant_isolation" ON "IpAssignment"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );

-- ---- DhcpRange --------------------------------------------------
ALTER TABLE "DhcpRange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DhcpRange" FORCE ROW LEVEL SECURITY;
CREATE POLICY "DhcpRange_tenant_isolation" ON "DhcpRange"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );

-- ---- Vlan -------------------------------------------------------
ALTER TABLE "Vlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vlan" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Vlan_tenant_isolation" ON "Vlan"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );

-- ---- VlanAssignment --------------------------------------------
ALTER TABLE "VlanAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VlanAssignment" FORCE ROW LEVEL SECURITY;
CREATE POLICY "VlanAssignment_tenant_isolation" ON "VlanAssignment"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );

-- ---- Connection -------------------------------------------------
ALTER TABLE "Connection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Connection" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Connection_tenant_isolation" ON "Connection"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );

-- ---- FloorPlan --------------------------------------------------
ALTER TABLE "FloorPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FloorPlan" FORCE ROW LEVEL SECURITY;
CREATE POLICY "FloorPlan_tenant_isolation" ON "FloorPlan"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );

-- ---- DiscoveryScan ---------------------------------------------
ALTER TABLE "DiscoveryScan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscoveryScan" FORCE ROW LEVEL SECURITY;
CREATE POLICY "DiscoveryScan_tenant_isolation" ON "DiscoveryScan"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );

-- ---- BuildPlan -------------------------------------------------
ALTER TABLE "BuildPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BuildPlan" FORCE ROW LEVEL SECURITY;
CREATE POLICY "BuildPlan_tenant_isolation" ON "BuildPlan"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );

-- ---- RecommendationDismissal -----------------------------------
ALTER TABLE "RecommendationDismissal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecommendationDismissal" FORCE ROW LEVEL SECURITY;
CREATE POLICY "RecommendationDismissal_tenant_isolation" ON "RecommendationDismissal"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );

-- ---- AuditLog ---------------------------------------------------
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY "AuditLog_tenant_isolation" ON "AuditLog"
  USING (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR coalesce(current_setting('app.organization_id', true), '') = ''
    OR "organizationId" = current_setting('app.organization_id', true)
  );
