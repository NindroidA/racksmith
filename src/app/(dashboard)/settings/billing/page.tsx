import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";

import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getOrganizationPlan, TIER_LIMITS } from "@/lib/tiers";
import {
  PLAN_PRICING_USD,
  STRIPE_PRICE_IDS,
  getMissingStripeConfig,
  lookupPriceId,
} from "@/lib/stripe";

import { PlanSummaryCard } from "./plan-summary-card";
import { UpgradeOptions } from "./upgrade-options";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { session, organizationId } = await requireMember("admin");
  const params = await searchParams;

  const [plan, org] = await Promise.all([
    getOrganizationPlan(organizationId),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        plan: true,
        planExpiresAt: true,
        stripeCustomerId: true,
        stripePriceId: true,
        paymentStatus: true,
        members: { select: { id: true } },
      },
    }),
  ]);
  if (!org) {
    // requireMember would have redirected if the org didn't exist; this
    // shouldn't fire. Defensive bail rather than crash on undefined.
    return (
      <div className="mx-auto max-w-3xl p-6 text-white/60">
        Organization not found.
      </div>
    );
  }

  const memberCount = org.members.length;
  const billingMisconfigured = getMissingStripeConfig().length > 0;

  // Derive billing cycle + monthly cost from the recorded stripePriceId.
  // For paid orgs the webhook will have stamped a known price; lookup
  // returns null if the row drifted (e.g. manual Stripe-dashboard edit).
  const priceLookup = org.stripePriceId
    ? lookupPriceId(org.stripePriceId)
    : null;
  const cycleLabel = priceLookup
    ? priceLookup.cycle === "monthly"
      ? "Monthly"
      : "Annual"
    : null;
  const summary =
    plan !== "free" && priceLookup
      ? buildSummary(plan, priceLookup.cycle, memberCount)
      : null;
  const nextBillingDateLabel =
    plan !== "free" && org.planExpiresAt
      ? org.planExpiresAt.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to settings
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <p className="text-sm text-white/50">
            Manage your subscription and payment method.
          </p>
        </div>
      </div>

      {params.status === "success" && (
        <div className="mb-6 rounded-xl border border-accent-green/30 bg-accent-green/[0.06] p-4 text-sm text-accent-green">
          Checkout completed. Your plan should update within a few seconds —
          refresh this page if you don&apos;t see the change immediately.
        </div>
      )}
      {params.status === "cancelled" && (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
          Checkout cancelled. No charges were made.
        </div>
      )}

      <section className="glass-card mb-6 rounded-xl p-6">
        <h2 className="mb-1 text-base font-semibold text-white">
          Current plan
        </h2>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-white">
            {TIER_LIMITS[plan].label}
          </span>
          {org.paymentStatus === "past_due" && (
            <span className="rounded-full bg-accent-orange/15 px-2.5 py-0.5 text-xs font-medium text-accent-orange">
              Payment failed — update your card
            </span>
          )}
          {org.paymentStatus === "canceled" && (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">
              Cancelled
            </span>
          )}
        </div>
        {plan !== "free" && org.planExpiresAt && (
          <p className="mt-1 text-sm text-white/50">
            Renews{" "}
            {org.planExpiresAt.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </section>

      {billingMisconfigured && (
        <div className="mb-6 rounded-xl border border-accent-red/30 bg-accent-red/[0.06] p-4 text-sm text-accent-red">
          Billing is not fully configured on this deployment. Stripe keys or
          price IDs are missing — checkout will fail until they&apos;re set.
          Maintainers should review <code>.env</code> against{" "}
          <code>.env.example</code>.
        </div>
      )}

      {plan === "free" ? (
        <UpgradeOptions
          memberCount={memberCount}
          emailVerified={Boolean(session.user.emailVerified)}
          priceIds={STRIPE_PRICE_IDS}
          disabled={billingMisconfigured}
        />
      ) : (
        <PlanSummaryCard
          planLabel={TIER_LIMITS[plan].label}
          cycleLabel={cycleLabel}
          monthlyDisplay={summary?.display ?? "—"}
          monthlyDetail={summary?.detail ?? "Pricing details unavailable"}
          nextBillingDateLabel={nextBillingDateLabel}
          paymentStatus={org.paymentStatus}
        />
      )}
    </div>
  );
}

function buildSummary(
  plan: "pro" | "business",
  cycle: "monthly" | "annual",
  memberCount: number,
): { display: string; detail: string } {
  if (plan === "pro") {
    if (cycle === "monthly") {
      return {
        display: `$${PLAN_PRICING_USD.pro_monthly}/mo`,
        detail: "Flat rate, billed monthly",
      };
    }
    return {
      display: `$${PLAN_PRICING_USD.pro_annual}/yr`,
      detail: "Flat rate, billed annually",
    };
  }
  // Business — per-seat
  const seatsLabel = `${memberCount} member${memberCount === 1 ? "" : "s"}`;
  if (cycle === "monthly") {
    const perSeat = PLAN_PRICING_USD.business_monthly;
    return {
      display: `$${perSeat * memberCount}/mo`,
      detail: `${seatsLabel} × $${perSeat}/mo`,
    };
  }
  const perSeatYr = PLAN_PRICING_USD.business_annual;
  return {
    display: `$${perSeatYr * memberCount}/yr`,
    detail: `${seatsLabel} × $${perSeatYr}/yr`,
  };
}
