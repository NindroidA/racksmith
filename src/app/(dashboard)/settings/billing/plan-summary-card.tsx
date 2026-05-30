"use client";

import { useTransition } from "react";
import { ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

import { describeError } from "@/lib/error-message";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";

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

type StatusMeta = {
  tone: "success" | "warning" | "danger" | "neutral";
  label: string;
};

function statusMeta(status: string | null): StatusMeta | null {
  switch (status) {
    case "active":
      return { tone: "success", label: "Active" };
    case "past_due":
      return { tone: "warning", label: "Past due — update card" };
    case "canceled":
      return { tone: "neutral", label: "Cancelled" };
    case "incomplete":
      return { tone: "warning", label: "Incomplete — finish checkout" };
    default:
      return null;
  }
}

export function PlanSummaryCard({
  planLabel,
  cycleLabel,
  monthlyDisplay,
  monthlyDetail,
  nextBillingDateLabel,
  paymentStatus,
}: Props) {
  const [pending, start] = useTransition();
  const status = statusMeta(paymentStatus);

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
    <section
      className={
        // Distinctive accent: thin primary stripe on the left edge marks
        // this card as the "currently-relevant action" surface (per the
        // §4 three-tier card hierarchy in the audit). Visually
        // differentiates it from neutral content cards and from the
        // upgrade cards (those keep their plain glass treatment).
        "glass-card relative overflow-hidden rounded-xl p-6 pl-7 " +
        "before:absolute before:left-0 before:top-0 before:h-full before:w-0.75 " +
        "before:bg-linear-to-b before:from-primary before:via-primary/70 before:to-accent-cyan/60"
      }
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="mb-0.5 text-lg font-semibold txt-strong">
            Manage subscription
          </h2>
          <p className="text-sm txt-body">
            Plan switches, payment method, invoices, and cancellation are
            handled in the Stripe customer portal.
          </p>
        </div>
        <Button
          onClick={openPortal}
          loading={pending}
          iconRight={!pending ? <ExternalLink className="h-3.5 w-3.5" /> : null}
          aria-label="Open Stripe customer portal in a new tab"
        >
          {pending ? "Opening…" : "Manage billing"}
        </Button>
      </div>

      {status && (
        <div className="mb-5 flex items-center gap-2">
          <Tag tone={status.tone} size="md">
            {status.label}
          </Tag>
          {paymentStatus === "past_due" && (
            <span className="text-xs txt-muted">
              Stripe will retry automatically — fix it now to avoid a lapse.
            </span>
          )}
        </div>
      )}

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
        <Row label="Plan" value={planLabel} />
        {cycleLabel && <Row label="Billing cycle" value={cycleLabel} />}
        {/* Numeric values (price, dates) flip the row to mono so the
            data lines up across the grid and visually reads as data,
            not chrome. The teaching pattern for future call sites. */}
        <Row label="Price" value={monthlyDisplay} hint={monthlyDetail} mono />
        {nextBillingDateLabel && (
          <Row label="Next invoice" value={nextBillingDateLabel} mono />
        )}
      </dl>
    </section>
  );
}

function Row({
  label,
  value,
  hint,
  mono = false,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Flip the value (+ hint) to the mono family for numeric / IP / id readouts. */
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs txt-faint">{label}</dt>
      <dd
        className={`mt-0.5 text-base font-medium txt-strong tabular ${mono ? "mono" : ""}`}
      >
        {value}
      </dd>
      {hint && (
        <dd className={`mt-0.5 text-xs txt-muted ${mono ? "mono" : ""}`}>
          {hint}
        </dd>
      )}
    </div>
  );
}
