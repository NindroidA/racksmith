"use client";

import { useState, useTransition } from "react";
import { Warning, ArrowSquareOut, X } from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { createPortalSession } from "@/app/(dashboard)/settings/billing/actions";

type Props = {
  planLabel: string;
};

// Site-wide banner shown when an org's last payment failed. Only
// admins/owners see it because only they can resolve it (createPortalSession
// requires admin rank). Plan stays active during Stripe Smart Retries
// per Q6 lock — the banner gives the admin a recovery path without
// forcing a hard downgrade UX.
//
// Uses the "vibrancy escalation" tier of the palette (--color-accent-orange-bright
// + --color-accent-orange-glow). Static UI keeps the refined sodium amber;
// banners get the brighter signal. The glow on the icon tile and CTA is the
// "this needs your attention" cue that the previous all-refined version was
// missing.
export function PaymentStatusBanner({ planLabel }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [pending, start] = useTransition();

  if (dismissed) return null;

  const openPortal = () => {
    start(async () => {
      const res = await createPortalSession();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.location.href = res.data.url;
    });
  };

  return (
    <div
      className="relative mb-6 flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 text-sm"
      style={{
        borderColor:
          "color-mix(in srgb, var(--color-accent-orange-bright) 50%, transparent)",
        background:
          "linear-gradient(90deg, color-mix(in srgb, var(--color-accent-orange-bright) 14%, transparent) 0%, color-mix(in srgb, var(--color-accent-orange-bright) 6%, transparent) 100%)",
      }}
    >
      {/* Left-edge accent stripe — the bright tier, pulled out so the eye
          locks onto it before the icon or copy. */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: "var(--color-accent-orange-bright)" }}
      />
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#1a1308]"
        aria-hidden="true"
        style={{
          background: "var(--color-accent-orange-bright)",
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.15), 0 2px 6px var(--color-accent-orange-glow)",
        }}
      >
        <Warning className="h-4 w-4" weight="duotone" />
      </span>
      <div className="flex-1 txt-body">
        <span className="font-semibold txt-strong">Payment failed.</span> Update
        your payment method to keep RackSmith {planLabel}. We&apos;ll retry the
        charge automatically — fix it now to avoid an interruption.
      </div>
      <Button
        size="sm"
        variant="primary"
        onClick={openPortal}
        loading={pending}
        iconRight={
          !pending ? <ArrowSquareOut className="h-3 w-3" weight="bold" /> : null
        }
        className="text-[#1a1308] shadow-[0_1px_4px_var(--color-accent-orange-glow)]"
        style={{
          background: "var(--color-accent-orange-bright)",
        }}
        aria-label="Open Stripe customer portal to update payment method"
      >
        {pending ? "Opening…" : "Update payment"}
      </Button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-md p-1 txt-faint transition-colors hover:bg-white/6 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" weight="bold" />
      </button>
    </div>
  );
}
