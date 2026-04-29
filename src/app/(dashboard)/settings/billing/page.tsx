import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";

import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getOrganizationPlan, TIER_LIMITS } from "@/lib/tiers";
import { STRIPE_PRICE_IDS, getMissingStripeConfig } from "@/lib/stripe";

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
        <section className="glass-card rounded-xl p-6">
          <h2 className="mb-2 text-base font-semibold text-white">
            Manage subscription
          </h2>
          <p className="text-sm text-white/60">
            Plan switches, payment-method updates, invoice history, and
            cancellation are managed via the Stripe customer portal — wiring
            for that ships in the next billing PR.
          </p>
        </section>
      )}
    </div>
  );
}
