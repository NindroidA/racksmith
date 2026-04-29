"use client";

import { useId, useState, useTransition } from "react";
import { Sparkles, Building2, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { describeError } from "@/lib/error-message";
import type { PriceKey } from "@/lib/stripe";

import { createCheckoutSession } from "./actions";

type Props = {
  memberCount: number;
  emailVerified: boolean;
  priceIds: Record<PriceKey, string>;
  disabled?: boolean;
};

type Cycle = "monthly" | "annual";

const PRO_MONTHLY = 9;
const PRO_ANNUAL = 90;
const BUSINESS_MONTHLY = 29;
const BUSINESS_ANNUAL = 290;

function priceFor(
  tier: "pro" | "business",
  cycle: Cycle,
  memberCount: number,
): { display: string; sub: string } {
  if (tier === "pro") {
    if (cycle === "monthly") {
      return { display: `$${PRO_MONTHLY}`, sub: "per month" };
    }
    return { display: `$${PRO_ANNUAL}`, sub: "per year (save ~17%)" };
  }
  // Business — per-seat
  const seatsLabel = `${memberCount} member${memberCount === 1 ? "" : "s"}`;
  if (cycle === "monthly") {
    return {
      display: `$${BUSINESS_MONTHLY * memberCount}`,
      sub: `${seatsLabel} × $${BUSINESS_MONTHLY}/mo`,
    };
  }
  return {
    display: `$${BUSINESS_ANNUAL * memberCount}`,
    sub: `${seatsLabel} × $${BUSINESS_ANNUAL}/yr (save ~17%)`,
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
      <section className="glass-card rounded-xl border border-accent-orange/30 p-6">
        <div className="mb-2 flex items-center gap-2 text-base font-semibold text-accent-orange">
          <Sparkles className="h-4 w-4" />
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
    <section className="glass-card rounded-xl p-6">
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
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          name="Pro"
          tagline="Unlimited racks, team, and API access"
          price={priceFor("pro", cycle, memberCount)}
          features={PRO_FEATURES}
          ctaLabel={pendingTier === "pro" ? "Redirecting…" : "Upgrade to Pro"}
          onSelect={() => handleUpgrade("pro")}
          pending={pendingTier === "pro" && pending}
          disabled={disabled || pending}
        />
        <PlanCard
          tier="business"
          icon={<Building2 className="h-5 w-5 text-primary" />}
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
  onSelect,
}: CardProps) {
  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <span className="text-base font-semibold text-white">{name}</span>
      </div>
      <p className="mb-4 text-sm text-white/60">{tagline}</p>

      <div className="mb-5">
        <div className="text-3xl font-bold text-white">{price.display}</div>
        <div className="text-xs text-white/50">{price.sub}</div>
      </div>

      <ul className="mb-6 flex flex-col gap-2 text-sm text-white/70">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-green" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-busy={pending}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {ctaLabel}
      </button>
    </div>
  );
}
