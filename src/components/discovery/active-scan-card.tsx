"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import { CircleNotch, X } from "@phosphor-icons/react/dist/ssr";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { cancelScan } from "@/app/(dashboard)/discovery/actions";

type Props = {
  scanId: string;
  subnet: string;
  startedAt: Date;
};

export function ActiveScanCard({ scanId, subnet, startedAt }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState(
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
  );
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Tick elapsed time
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Poll scan status every 2s. When the scan reaches a terminal state we
  // announce the result via toast — react-hot-toast renders role=status
  // aria-live="polite", so screen readers learn the scan finished without
  // needing a dedicated live region (the active-scan card itself unmounts
  // immediately after router.refresh, so it can't host the announcement).
  // The terminatedRef guard fires the announcement exactly once even if
  // the next interval tick lands before React unmounts the component.
  const terminatedRef = useRef(false);
  useEffect(() => {
    const poll = setInterval(async () => {
      if (terminatedRef.current) return;
      try {
        const res = await fetch(`/api/discovery/scan?id=${scanId}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          status?: string;
          hostsFound?: number;
          hostsNew?: number;
          error?: string | null;
        };
        if (terminatedRef.current) return;
        if (data.status === "completed") {
          terminatedRef.current = true;
          clearInterval(poll);
          const newCount = data.hostsNew ?? 0;
          const totalCount = data.hostsFound ?? 0;
          toast.success(
            `Scan complete. ${newCount} new host${newCount === 1 ? "" : "s"} (of ${totalCount} found).`,
          );
          router.refresh();
        } else if (data.status === "failed") {
          terminatedRef.current = true;
          clearInterval(poll);
          toast.error(data.error || "Scan failed.");
          router.refresh();
        } else if (data.status === "cancelled") {
          // Terminal but not an error — performCancel already toasted on
          // the action result. Just stop polling so we don't fire again.
          terminatedRef.current = true;
          clearInterval(poll);
          router.refresh();
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [scanId, router]);

  function performCancel() {
    startTransition(async () => {
      const result = await cancelScan(scanId);
      if (!result.ok) {
        toast.error(result.error);
        setConfirmOpen(false);
      } else {
        toast.success("Scan cancelled");
        setConfirmOpen(false);
        router.refresh();
      }
    });
  }

  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  const elapsedStr = `${min}:${String(sec).padStart(2, "0")}`;

  return (
    <div className="surface-elevated overflow-hidden border-accent-green/30 bg-accent-green/[0.04] p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CircleNotch
              className={`h-6 w-6 text-accent-green ${reduceMotion ? "" : "animate-spin"}`}
              weight="duotone"
              aria-hidden
            />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span
                className="led-dot led-dot--amber led-dot--live"
                aria-hidden
              />
              <span>
                Scanning{" "}
                <span className="mono text-accent-green">{subnet}</span>
              </span>
            </div>
            <div className="text-xs text-white/50">
              Started · running for <span className="mono">{elapsedStr}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-1.5 text-xs font-medium text-accent-red transition-all hover:bg-accent-red/20 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" weight="bold" aria-hidden />
          Cancel
        </button>
      </div>

      {/* Subtle progress bar (indeterminate since nmap doesn't stream progress) */}
      <div
        role="progressbar"
        aria-label={`Scan in progress for ${subnet}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext="Running"
        className="mt-4 h-1 overflow-hidden rounded-full bg-accent-green/10"
      >
        <div
          className={`h-full w-1/3 rounded-full bg-accent-green/60 ${reduceMotion ? "" : "animate-[scan-slide_2s_ease-in-out_infinite]"}`}
        />
      </div>

      <DeleteConfirmDialog
        open={confirmOpen}
        onClose={() => !pending && setConfirmOpen(false)}
        title="Cancel scan?"
        body={
          <p>
            Cancel the in-progress scan of{" "}
            <span className="mono text-white">{subnet}</span>? The scan will
            stop and no new hosts will be discovered from this run.
          </p>
        }
        confirmLabel="Cancel scan"
        pending={pending}
        onConfirm={performCancel}
      />
    </div>
  );
}
