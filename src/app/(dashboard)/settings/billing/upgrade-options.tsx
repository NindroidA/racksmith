"use client";

import { useId, useState, useTransition } from "react";
import {
  Sparkle,
  Buildings,
  Check,
  CircleNotch,
} from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { describeError } from "@/lib/error-message";
import { PLAN_PRICING_USD, type PriceKey } from "@/lib/billing-pricing";

import { createCheckoutSession } from "./actions";

type Props = {
  memberCount: number;
  emailVerified: boolean;
  priceIds: Record<PriceKey, string>;
  disabled?: boolean;
  // Set by `/settings/billing?tier=pro|business` (landing-page CTAs).
  // The matching card gets a primary-color border so the user lands on
  // the choice they made before signing up. Visual hint only — the user
  // is still free to pick the other tier.
  recommendedTier?: "pro" | "business" | null;
};

type Cycle = "monthly" | "annual";

function priceFor(
  tier: "pro" | "business",
  cycle: Cycle,
  memberCount: number,
): { display: string; sub: string } {
  if (tier === "pro") {
    if (cycle === "monthly") {
      return { display: `$${PLAN_PRICING_USD.pro_monthly}`, sub: "per month" };
    }
    return {
      display: `$${PLAN_PRICING_USD.pro_annual}`,
      sub: "per year (save ~17%)",
    };
  }
  // Business — per-seat
  const seatsLabel = `${memberCount} member${memberCount === 1 ? "" : "s"}`;
  const monthly = PLAN_PRICING_USD.business_monthly;
  const annual = PLAN_PRICING_USD.business_annual;
  if (cycle === "monthly") {
    return {
      display: `$${monthly * memberCount}`,
      sub: `${seatsLabel} × $${monthly}/mo`,
    };
  }
  return {
    display: `$${annual * memberCount}`,
    sub: `${seatsLabel} × $${annual}/yr (save ~17%)`,
  };
}

const PRO_FEATURES = [
  "Unlimited sites and racks",
  "Up to 5 team members",
  "Public REST API access",
  "PDF / CSV / SVG exports",
  "Audit log export",
];

const BUSINESS_FEATURES = [
  "Everything in Pro",
  "Unlimited team members",
  "Higher API rate limits",
  "Advanced audit log viewer",
  "Priority support",
];

export function UpgradeOptions({
  memberCount,
  emailVerified,
  priceIds,
  disabled = false,
  recommendedTier = null,
}: Props) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [pending, start] = useTransition();
  const [pendingTier, setPendingTier] = useState<"pro" | "business" | null>(
    null,
  );
  const toggleId = useId();

  const handleUpgrade = (tier: "pro" | "business") => {
    const key: PriceKey = `${tier}_${cycle}` as const;
    const priceId = priceIds[key];
    if (!priceId) {
      toast.error(`${tier} ${cycle} pricing isn't configured.`);
      return;
    }
    setPendingTier(tier);
    start(async () => {
      try {
        const res = await createCheckoutSession({ priceId });
        if (!res.ok) {
          toast.error(res.error);
          setPendingTier(null);
          return;
        }
        // Redirect off-site. We don't clear pendingTier on success — the
        // browser is leaving this page anyway.
        window.location.href = res.data.url;
      } catch (err) {
        toast.error(describeError(err, "Failed to start checkout"));
        setPendingTier(null);
      }
    });
  };

  if (!emailVerified) {
    return (
      <section className="surface-card border border-accent-orange/30 p-6">
        <div className="mb-2 flex items-center gap-2 text-base font-semibold text-accent-orange">
          <Sparkle className="h-4 w-4" weight="duotone" />
          Verify your email to upgrade
        </div>
        <p className="text-sm text-white/60">
          A verified email is required before starting a paid subscription. We
          sent a verification link when you signed up — check your inbox, or
          request a new one from{" "}
          <a
            href="/settings"
            className="text-primary underline-offset-2 hover:underline"
          >
            Settings → Profile
          </a>
          .
        </p>
      </section>
    );
  }

  const annual = cycle === "annual";

  return (
    <section className="surface-card p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">
            Upgrade your plan
          </h2>
          <p className="text-sm text-white/50">
            Pay monthly or save with annual billing.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-labelledby={toggleId}
          className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-xs"
        >
          <span id={toggleId} className="sr-only">
            Billing cycle
          </span>
          <button
            type="button"
            role="radio"
            aria-checked={!annual}
            onClick={() => setCycle("monthly")}
            disabled={pending}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              !annual
                ? "bg-primary text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={annual}
            onClick={() => setCycle("annual")}
            disabled={pending}
            className={`rounded-full px-3 py-1 font-medium transition-colors ${
              annual
                ? "bg-primary text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            Annual <span className="opacity-70">· save 17%</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard
          tier="pro"
          icon={<Sparkle className="h-5 w-5 text-primary" weight="duotone" />}
          name="Pro"
          tagline="Unlimited racks, team, and API access"
          price={priceFor("pro", cycle, memberCount)}
          features={PRO_FEATURES}
          ctaLabel={pendingTier === "pro" ? "Redirecting…" : "Upgrade to Pro"}
          onSelect={() => handleUpgrade("pro")}
          pending={pendingTier === "pro" && pending}
          disabled={disabled || pending}
          recommended={recommendedTier === "pro"}
        />
        <PlanCard
          tier="business"
          icon={<Buildings className="h-5 w-5 text-primary" weight="duotone" />}
          name="Business"
          tagline="Per-seat pricing for growing teams"
          price={priceFor("business", cycle, memberCount)}
          features={BUSINESS_FEATURES}
          ctaLabel={
            pendingTier === "business" ? "Redirecting…" : "Upgrade to Business"
          }
          onSelect={() => handleUpgrade("business")}
          pending={pendingTier === "business" && pending}
          disabled={disabled || pending}
          recommended={recommendedTier === "business"}
        />
      </div>

      <p className="mt-5 text-xs text-white/40">
        Secure checkout powered by Stripe. You can cancel anytime — your plan
        stays active until the end of the billing period.
      </p>
    </section>
  );
}

type CardProps = {
  tier: "pro" | "business";
  icon: React.ReactNode;
  name: string;
  tagline: string;
  price: { display: string; sub: string };
  features: string[];
  ctaLabel: string;
  pending: boolean;
  disabled: boolean;
  recommended?: boolean;
  onSelect: () => void;
};

function PlanCard({
  icon,
  name,
  tagline,
  price,
  features,
  ctaLabel,
  pending,
  disabled,
  recommended = false,
  onSelect,
}: CardProps) {
  return (
    <div
      className={
        recommended
          ? "surface-elevated relative flex flex-col border border-primary/60 p-5"
          : "surface-card flex flex-col p-5"
      }
    >
      {recommended && (
        <div className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          You picked this
        </div>
      )}
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <span className="text-base font-semibold text-white">{name}</span>
      </div>
      <p className="mb-4 text-sm text-white/60">{tagline}</p>

      <div className="mb-5">
        <div className="mono text-3xl font-bold text-white">
          {price.display}
        </div>
        <div className="text-xs text-white/50">{price.sub}</div>
      </div>

      <ul className="mb-6 flex flex-col gap-2 text-sm text-white/70">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-green"
              weight="bold"
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        variant="primary"
        onClick={onSelect}
        disabled={disabled}
        aria-busy={pending}
        className="mt-auto w-full"
        iconLeft={
          pending ? (
            <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
          ) : undefined
        }
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
