"use client";

import { useTransition } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { describeError } from "@/lib/error-message";

import { createPortalSession } from "./actions";

type Props = {
  planLabel: string;
  cycleLabel: string | null;
  monthlyDisplay: string;
  monthlyDetail: string;
  nextBillingDateLabel: string | null;
  // Organization.paymentStatus is `String?` in Prisma; narrow at render
  // time. Anything outside the known set falls through to "—" rather
  // than blowing up if a future webhook writes a new value.
  paymentStatus: string | null;
};

export function PlanSummaryCard({
  planLabel,
  cycleLabel,
  monthlyDisplay,
  monthlyDetail,
  nextBillingDateLabel,
  paymentStatus,
}: Props) {
  const [pending, start] = useTransition();

  const openPortal = () => {
    start(async () => {
      try {
        const res = await createPortalSession();
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        window.location.href = res.data.url;
      } catch (err) {
        toast.error(describeError(err, "Failed to open billing portal"));
      }
    });
  };

  return (
    <section className="glass-card rounded-xl p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="mb-0.5 text-base font-semibold text-white">
            Manage subscription
          </h2>
          <p className="text-sm text-white/50">
            Plan switches, payment method, invoices, and cancellation are
            handled in the Stripe customer portal.
          </p>
        </div>
        <button
          type="button"
          onClick={openPortal}
          disabled={pending}
          aria-busy={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          {pending ? "Opening…" : "Manage billing"}
        </button>
      </div>

      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <Row label="Plan" value={planLabel} />
        {cycleLabel && <Row label="Billing cycle" value={cycleLabel} />}
        <Row label="Monthly cost" value={monthlyDisplay} hint={monthlyDetail} />
        {nextBillingDateLabel && (
          <Row label="Next invoice" value={nextBillingDateLabel} />
        )}
        {paymentStatus && (
          <Row
            label="Payment status"
            value={paymentStatusLabel(paymentStatus)}
          />
        )}
      </dl>
    </section>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-white/40">{label}</dt>
      <dd className="mt-0.5 text-white">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-white/50">{hint}</dd>}
    </div>
  );
}

function paymentStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "past_due":
      return "Past due — update card";
    case "canceled":
      return "Cancelled";
    case "incomplete":
      return "Incomplete — finish checkout";
    default:
      return "—";
  }
}
