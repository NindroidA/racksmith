-- Phase 13 — Stripe billing linkage on Organization + StripeEvent ledger
--
-- All new Organization columns are nullable; existing free-tier orgs keep
-- NULL values. paymentStatus mirrors Stripe's subscription.status:
--   "active" | "past_due" | "canceled" | "incomplete" | NULL (free tier).
--
-- StripeEvent is a webhook idempotency ledger keyed on Stripe's event.id
-- (e.g. "evt_1NkLk2EeKn..."). Not tenant-scoped — webhooks arrive without
-- auth context, organizationId is resolved post-signature-verification.

-- AlterTable
ALTER TABLE "Organization"
  ADD COLUMN "stripeCustomerId"         TEXT,
  ADD COLUMN "stripeSubscriptionId"     TEXT,
  ADD COLUMN "stripeSubscriptionItemId" TEXT,
  ADD COLUMN "stripePriceId"            TEXT,
  ADD COLUMN "paymentStatus"            TEXT;

-- CreateIndex (unique constraints on the Stripe identity columns)
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key"     ON "Organization"("stripeCustomerId");
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id"             TEXT      NOT NULL,
    "type"           TEXT      NOT NULL,
    "payload"        JSONB     NOT NULL,
    "processedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,
    "errorMessage"   TEXT,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StripeEvent_type_processedAt_idx"  ON "StripeEvent"("type", "processedAt");
CREATE INDEX "StripeEvent_organizationId_idx"    ON "StripeEvent"("organizationId");

-- AddForeignKey
ALTER TABLE "StripeEvent"
  ADD CONSTRAINT "StripeEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
