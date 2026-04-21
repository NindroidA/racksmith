-- Phase 10d: ownership transfer + Better Auth session.activeOrganizationId

-- Better Auth's organization plugin writes activeOrganizationId to the
-- session record when accept-invitation or set-active-organization runs.
-- Our app reads from User.activeOrganizationId, but the column has to exist
-- on Session or BA's adapter throws on the unknown field.
ALTER TABLE "Session" ADD COLUMN "activeOrganizationId" TEXT;

-- Email-confirmed ownership handoff (owner → target member). The row's id
-- is the opaque single-use token sent in the confirmation email.
CREATE TABLE "OwnershipTransfer" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "fromUserId"     TEXT NOT NULL,
  "toUserId"       TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "acceptedAt"     TIMESTAMP(3),
  "revokedAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OwnershipTransfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OwnershipTransfer_organizationId_status_idx"
  ON "OwnershipTransfer" ("organizationId", "status");
CREATE INDEX "OwnershipTransfer_toUserId_status_idx"
  ON "OwnershipTransfer" ("toUserId", "status");
CREATE INDEX "OwnershipTransfer_expiresAt_idx"
  ON "OwnershipTransfer" ("expiresAt");

ALTER TABLE "OwnershipTransfer"
  ADD CONSTRAINT "OwnershipTransfer_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OwnershipTransfer"
  ADD CONSTRAINT "OwnershipTransfer_fromUserId_fkey"
  FOREIGN KEY ("fromUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OwnershipTransfer"
  ADD CONSTRAINT "OwnershipTransfer_toUserId_fkey"
  FOREIGN KEY ("toUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
