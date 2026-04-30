"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ExternalLink, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

import { describeError } from "@/lib/error-message";
import { createPortalSession } from "@/app/(dashboard)/settings/billing/actions";

type Props = {
  planLabel: string;
};

// Site-wide banner shown when an org's last payment failed. Only
// admins/owners see it because only they can resolve it (createPortalSession
// requires admin rank). Plan stays active during Stripe Smart Retries
// per Q6 lock — the banner gives the admin a recovery path without
// forcing a hard downgrade UX.
export function PaymentStatusBanner({ planLabel }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [pending, start] = useTransition();

  if (dismissed) return null;

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
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent-orange/30 bg-accent-orange/[0.06] px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-accent-orange" />
      <div className="flex-1 text-white/80">
        <span className="font-medium text-white">Payment failed.</span>{" "}
        Update your payment method to keep RackSmith {planLabel}. We&apos;ll
        retry the charge automatically — fix it now to avoid an interruption.
      </div>
      <button
        type="button"
        onClick={openPortal}
        disabled={pending}
        aria-busy={pending}
        className="inline-flex items-center gap-1 text-xs font-medium text-accent-orange transition-colors hover:text-white disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ExternalLink className="h-3.5 w-3.5" />
        )}
        {pending ? "Opening…" : "Update payment"}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-white/40 transition-colors hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
