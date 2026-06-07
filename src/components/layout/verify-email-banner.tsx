"use client";

import { useState } from "react";
import Link from "next/link";
import { WarningCircle, Check, X } from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { describeError } from "@/lib/error-message";
import { Button } from "@/components/ui/button";

type Props = { email: string };

// Vibrancy-escalated counterpart of PaymentStatusBanner — same visual
// language so the two banner types feel related, but this one uses
// primary-bright (indigo) rather than orange-bright since "verify your
// email" is an inviting nudge, not a payment-failed warning.
export function VerifyEmailBanner({ email }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (dismissed) return null;

  async function handleResend() {
    setLoading(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/verify-email",
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to resend");
      } else {
        setSent(true);
        toast.success(`Verification link sent to ${email}`);
      }
    } catch (err) {
      toast.error(describeError(err, "Failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative mb-6 flex flex-col gap-3 overflow-hidden rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center"
      style={{
        borderColor:
          "color-mix(in srgb, var(--color-primary-bright) 50%, transparent)",
        background:
          "linear-gradient(90deg, color-mix(in srgb, var(--color-primary-bright) 14%, transparent) 0%, color-mix(in srgb, var(--color-primary-bright) 6%, transparent) 100%)",
      }}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: "var(--color-primary-bright)" }}
      />
      <div className="flex flex-1 items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
          aria-hidden="true"
          style={{
            background: "var(--color-primary-bright)",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.15), 0 2px 6px var(--color-primary-glow)",
          }}
        >
          <WarningCircle className="h-4 w-4" weight="duotone" />
        </span>
        <div className="flex-1 txt-body">
          <span className="font-semibold txt-strong">Verify your email.</span>{" "}
          We sent a link to{" "}
          <span className="font-medium txt-strong tabular">{email}</span>. Click
          it to confirm this address.
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 pl-11 sm:pl-0">
        {sent ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-green">
            <Check className="h-3.5 w-3.5" weight="bold" /> Sent again
          </span>
        ) : (
          <Button
            size="sm"
            variant="primary"
            onClick={handleResend}
            loading={loading}
            className="min-h-11 shadow-[0_1px_4px_var(--color-primary-glow)] sm:min-h-0"
            style={{ background: "var(--color-primary-bright)" }}
          >
            {loading ? "Sending…" : "Resend link"}
          </Button>
        )}
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center text-xs txt-muted transition-colors hover:text-white sm:min-h-0"
        >
          Settings
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md txt-faint transition-colors hover:bg-white/6 hover:text-white sm:h-8 sm:w-8"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" weight="bold" />
        </button>
      </div>
    </div>
  );
}
