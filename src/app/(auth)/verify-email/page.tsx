"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { AuthShell } from "@/components/layout/auth-shell";

function VerifyResult() {
  const params = useSearchParams();
  const error = params.get("error");

  if (error) {
    const message =
      error === "INVALID_TOKEN"
        ? "This verification link is invalid or has expired."
        : error === "EMAIL_NOT_VERIFIED"
          ? "We couldn't verify your email. Try requesting a new link."
          : "Email verification failed. Try requesting a new link.";

    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-red/15">
          <WarningCircle className="h-6 w-6 text-accent-red" weight="duotone" />
        </div>
        <h1 className="mb-2 text-lg font-semibold text-white">
          Verification failed
        </h1>
        <p className="mb-6 max-w-sm text-sm text-white/60">{message}</p>
        <div className="flex gap-3 text-sm">
          <Link
            href="/settings"
            className="rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90"
          >
            Resend from settings
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-white/[0.06] px-4 py-2 text-white/70 transition-colors hover:bg-white/[0.1]"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-green/15">
        <CheckCircle className="h-6 w-6 text-accent-green" weight="duotone" />
      </div>
      <h1 className="mb-2 text-lg font-semibold text-white">Email verified</h1>
      <p className="mb-6 max-w-sm text-sm text-white/60">
        Your account is confirmed. You can now use RackSmith as normal.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        Go to dashboard
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        }
      >
        <VerifyResult />
      </Suspense>
    </AuthShell>
  );
}
