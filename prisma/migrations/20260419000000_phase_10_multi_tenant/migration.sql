-- Phase 10 Foundation: multi-tenant migration
-- ============================================================================
-- Creates Organization/Member/Invitation tables, adds organizationId to every
-- tenant-scoped model, backfills existing single-tenant data by creating one
-- personal Organization per existing User, flips new columns to NOT NULL with
-- foreign keys, and drops User.plan / User.planExpiresAt (moved to
-- Organization). Designed to run atomically inside one Prisma transaction.
--
-- See .plans/2026-04-19/02-phase-10-implementation-plan.md §3d for the step
-- breakdown and rationale.
-- ============================================================================

-- ============================================================================
-- Step 1: Create new tables
-- ============================================================================

CREATE TABLE "Organization" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "slug"          TEXT NOT NULL,
    "logo"          TEXT,
    "metadata"      JSONB,
    "plan"          TEXT NOT NULL DEFAULT 'free',
    "planExpiresAt" TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

CREATE TABLE "Member" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role"           TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Member_userId_organizationId_key" ON "Member"("userId", "organizationId");
CREATE INDEX "Member_organizationId_role_idx" ON "Member"("organizationId", "role");
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Invitation" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email"          TEXT NOT NULL,
    "role"           TEXT NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'pending',
    "expiresAt"      TIMESTAMP(3) NOT NULL,
    "inviterId"      TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Invitation_organizationId_email_idx" ON "Invitation"("organizationId", "email");
CREATE INDEX "Invitation_email_status_idx" ON "Invitation"("email", "status");
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Step 2: Add nullable organizationId columns + User.activeOrganizationId
-- ============================================================================

ALTER TABLE "User" ADD COLUMN "activeOrganizationId" TEXT;

ALTER TABLE "Rack"                    ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Device"                  ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Subnet"                  ADD COLUMN "organizationId" TEXT;
ALTER TABLE "IpAssignment"            ADD COLUMN "organizationId" TEXT;
ALTER TABLE "DhcpRange"               ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Vlan"                    ADD COLUMN "organizationId" TEXT;
ALTER TABLE "VlanAssignment"          ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Connection"              ADD COLUMN "organizationId" TEXT;
ALTER TABLE "FloorPlan"               ADD COLUMN "organizationId" TEXT;
ALTER TABLE "DiscoveryScan"           ADD COLUMN "organizationId" TEXT;
ALTER TABLE "BuildPlan"               ADD COLUMN "organizationId" TEXT;
ALTER TABLE "RecommendationDismissal" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AuditLog"                ADD COLUMN "organizationId" TEXT;

-- ============================================================================
-- Step 3: For each User, create a personal Organization
-- ============================================================================
-- Deterministic IDs ('org_' || user.id) so subsequent steps can look up the
-- org by user without a temp table. Slug derives from name when available,
-- falls back to id-suffix to guarantee uniqueness. Plan copies from User.plan.

INSERT INTO "Organization" (id, name, slug, plan, "planExpiresAt", "createdAt", "updatedAt")
SELECT
    'org_' || "User".id,
    CASE
        WHEN coalesce(trim("User".name), '') = '' THEN 'My Organization'
        ELSE "User".name || '''s Organization'
    END,
    CASE
        WHEN coalesce(trim("User".name), '') = ''
            THEN 'org-' || substring("User".id, 1, 12)
        ELSE lower(regexp_replace("User".name, '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substring("User".id, 1, 8)
    END,
    coalesce("User".plan, 'free'),
    "User"."planExpiresAt",
    now(),
    now()
FROM "User";

-- ============================================================================
-- Step 4: Each user is owner of their personal org
-- ============================================================================

INSERT INTO "Member" (id, "userId", "organizationId", role, "createdAt")
SELECT
    'mem_' || "User".id,
    "User".id,
    'org_' || "User".id,
    'owner',
    now()
FROM "User";

-- ============================================================================
-- Step 5: Backfill organizationId on every tenant-scoped table
-- ============================================================================

UPDATE "Rack"                    SET "organizationId" = 'org_' || "userId";
UPDATE "Device"                  SET "organizationId" = 'org_' || "userId";
UPDATE "Subnet"                  SET "organizationId" = 'org_' || "userId";
UPDATE "IpAssignment"            SET "organizationId" = 'org_' || "userId";
UPDATE "DhcpRange"               SET "organizationId" = 'org_' || "userId";
UPDATE "Vlan"                    SET "organizationId" = 'org_' || "userId";
UPDATE "VlanAssignment"          SET "organizationId" = 'org_' || "userId";
UPDATE "Connection"              SET "organizationId" = 'org_' || "userId";
UPDATE "FloorPlan"               SET "organizationId" = 'org_' || "userId";
UPDATE "DiscoveryScan"           SET "organizationId" = 'org_' || "userId";
UPDATE "BuildPlan"               SET "organizationId" = 'org_' || "userId";
UPDATE "RecommendationDismissal" SET "organizationId" = 'org_' || "userId";
UPDATE "AuditLog"                SET "organizationId" = 'org_' || "userId";

-- ============================================================================
-- Step 6: Set each user's active organization to their personal org
-- ============================================================================

UPDATE "User" SET "activeOrganizationId" = 'org_' || "id";

-- ============================================================================
-- Step 7: Flip organizationId to NOT NULL + add foreign keys + indexes
-- ============================================================================

-- Rack
ALTER TABLE "Rack" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Rack_organizationId_idx" ON "Rack"("organizationId");

-- Device
ALTER TABLE "Device" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Device" ADD CONSTRAINT "Device_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Device_organizationId_idx" ON "Device"("organizationId");

-- Subnet
ALTER TABLE "Subnet" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Subnet" ADD CONSTRAINT "Subnet_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Subnet_organizationId_idx" ON "Subnet"("organizationId");
-- Flip unique scope: (userId, cidr) → (organizationId, cidr)
DROP INDEX IF EXISTS "Subnet_userId_cidr_key";
CREATE UNIQUE INDEX "Subnet_organizationId_cidr_key" ON "Subnet"("organizationId", "cidr");

-- IpAssignment
ALTER TABLE "IpAssignment" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "IpAssignment" ADD CONSTRAINT "IpAssignment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "IpAssignment_organizationId_idx" ON "IpAssignment"("organizationId");

-- DhcpRange
ALTER TABLE "DhcpRange" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "DhcpRange" ADD CONSTRAINT "DhcpRange_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "DhcpRange_organizationId_idx" ON "DhcpRange"("organizationId");

-- Vlan
ALTER TABLE "Vlan" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Vlan" ADD CONSTRAINT "Vlan_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Vlan_organizationId_idx" ON "Vlan"("organizationId");
-- Flip unique scope: (userId, vlanId) → (organizationId, vlanId)
DROP INDEX IF EXISTS "Vlan_userId_vlanId_key";
CREATE UNIQUE INDEX "Vlan_organizationId_vlanId_key" ON "Vlan"("organizationId", "vlanId");

-- VlanAssignment
ALTER TABLE "VlanAssignment" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "VlanAssignment" ADD CONSTRAINT "VlanAssignment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "VlanAssignment_organizationId_idx" ON "VlanAssignment"("organizationId");

-- Connection
ALTER TABLE "Connection" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Connection_organizationId_idx" ON "Connection"("organizationId");

-- FloorPlan
ALTER TABLE "FloorPlan" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "FloorPlan" ADD CONSTRAINT "FloorPlan_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "FloorPlan_organizationId_idx" ON "FloorPlan"("organizationId");

-- DiscoveryScan
ALTER TABLE "DiscoveryScan" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "DiscoveryScan" ADD CONSTRAINT "DiscoveryScan_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "DiscoveryScan_organizationId_idx" ON "DiscoveryScan"("organizationId");

-- BuildPlan
ALTER TABLE "BuildPlan" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "BuildPlan" ADD CONSTRAINT "BuildPlan_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "BuildPlan_organizationId_status_idx" ON "BuildPlan"("organizationId", "status");

-- RecommendationDismissal
ALTER TABLE "RecommendationDismissal" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "RecommendationDismissal" ADD CONSTRAINT "RecommendationDismissal_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "RecommendationDismissal_organizationId_expiresAt_idx"
    ON "RecommendationDismissal"("organizationId", "expiresAt");
-- Flip unique scope: (userId, ruleKey, entityKey) → (organizationId, ruleKey, entityKey)
DROP INDEX IF EXISTS "RecommendationDismissal_userId_ruleKey_entityKey_key";
CREATE UNIQUE INDEX "RecommendationDismissal_organizationId_ruleKey_entityKey_key"
    ON "RecommendationDismissal"("organizationId", "ruleKey", "entityKey");

-- AuditLog
ALTER TABLE "AuditLog" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "AuditLog_organizationId_createdAt_idx"
    ON "AuditLog"("organizationId", "createdAt");

-- ============================================================================
-- Step 8: Drop User.plan + User.planExpiresAt (moved to Organization.plan)
-- ============================================================================

ALTER TABLE "User" DROP COLUMN "plan";
ALTER TABLE "User" DROP COLUMN "planExpiresAt";
