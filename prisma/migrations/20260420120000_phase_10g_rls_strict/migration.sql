-- Phase 10g: Tighten RLS — drop the "unset session variable = allow" branch
-- ============================================================================
-- The Phase 10b migration (20260419010000_phase_10_rls) shipped the RLS
-- policies in **compatibility mode**: the predicate allowed access when
-- `current_setting('app.organization_id', true)` was NULL so pre-10b call
-- sites kept working during the action-refactor pass.
--
-- Post-10g, every tenant-scoped Prisma call routes through `withTenant`
-- (which sets the session variable via `SELECT set_config(...)`) or
-- `withAdmin` (which sets `app.role = 'admin'`). The `audit-tenant-filter`
-- script asserts this at CI time — any direct `prisma.<model>.*` on a
-- tenant-scoped table fails the build.
--
-- With that invariant in place we can drop the NULL short-circuit. Post-
-- migration predicate shape:
--
--   current_setting('app.role', true) = 'admin'
--   OR "organizationId" = current_setting('app.organization_id', true)
--
-- Callers outside the wrappers hit a NULL session variable, which makes
-- the equality branch evaluate to NULL (not true). Combined with the
-- admin branch also being false, the policy rejects — reads return
-- empty, writes error out. That's the intended fail-closed behavior.
--
-- Postgres `ALTER POLICY ... USING ... WITH CHECK ...` rewrites both the
-- read and write predicates atomically per table.
-- ============================================================================

ALTER POLICY "Rack_tenant_isolation" ON "Rack"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );

ALTER POLICY "Device_tenant_isolation" ON "Device"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );

ALTER POLICY "Subnet_tenant_isolation" ON "Subnet"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );

ALTER POLICY "IpAssignment_tenant_isolation" ON "IpAssignment"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );

ALTER POLICY "DhcpRange_tenant_isolation" ON "DhcpRange"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );

ALTER POLICY "Vlan_tenant_isolation" ON "Vlan"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );

ALTER POLICY "VlanAssignment_tenant_isolation" ON "VlanAssignment"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );

ALTER POLICY "Connection_tenant_isolation" ON "Connection"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );

ALTER POLICY "FloorPlan_tenant_isolation" ON "FloorPlan"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );

ALTER POLICY "DiscoveryScan_tenant_isolation" ON "DiscoveryScan"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );

ALTER POLICY "BuildPlan_tenant_isolation" ON "BuildPlan"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );

ALTER POLICY "RecommendationDismissal_tenant_isolation" ON "RecommendationDismissal"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );

ALTER POLICY "AuditLog_tenant_isolation" ON "AuditLog"
  USING (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  )
  WITH CHECK (
    current_setting('app.role', true) = 'admin'
    OR "organizationId" = current_setting('app.organization_id', true)
  );
