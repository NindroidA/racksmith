"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, X } from "lucide-react";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";

type Props = { email: string };

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
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent-orange/30 bg-accent-orange/[0.06] px-4 py-3 text-sm">
      <AlertCircle className="h-4 w-4 shrink-0 text-accent-orange" />
      <div className="flex-1 text-white/80">
        <span className="font-medium text-white">Verify your email.</span>{" "}
        We sent a link to{" "}
        <span className="font-medium text-white">{email}</span>. Click it to
        confirm this address.
      </div>
      {sent ? (
        <span className="text-xs text-accent-green">Sent again</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={loading}
          className="text-xs font-medium text-accent-orange transition-colors hover:text-white disabled:opacity-60"
        >
          {loading ? "Sending…" : "Resend link"}
        </button>
      )}
      <Link
        href="/settings"
        className="text-xs text-white/50 transition-colors hover:text-white"
      >
        Settings
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="text-white/40 transition-colors hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
