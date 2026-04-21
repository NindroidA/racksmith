"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="glass-card w-full max-w-lg rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-red/15">
          <AlertTriangle className="h-6 w-6 text-accent-red" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-white">
          Something broke on this page
        </h1>
        <p className="mb-6 text-sm text-white/60">
          Your session and data are safe. Retry the action, or head back to the
          dashboard.
        </p>
        {error.digest && (
          <p className="mb-6 text-xs text-white/40">
            Error ID:{" "}
            <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono">
              {error.digest}
            </code>
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <RotateCw className="h-4 w-4" />
            Retry
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.1]"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
