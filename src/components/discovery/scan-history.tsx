"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";
import {
  WarningCircle,
  Prohibit,
  CheckCircle,
  ClockCounterClockwise,
  CircleNotch,
  TrashSimple,
} from "@phosphor-icons/react/dist/ssr";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { deleteScan } from "@/app/(dashboard)/discovery/actions";

// Friendlier copy for the database enum so users see "Done" instead of
// "completed" / "failed" / "running" / "pending" / "cancelled".
const STATUS_LABELS: Record<string, string> = {
  completed: "Done",
  failed: "Failed",
  running: "Scanning…",
  pending: "Queued",
  cancelled: "Cancelled",
};

type ConfirmTarget = { id: string; subnet: string } | null;

export type ScanHistoryRow = {
  id: string;
  subnet: string;
  status: string;
  hostsFound: number;
  hostsNew: number;
  hostsKnown: number;
  duration: number | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
};

type Props = {
  scans: ScanHistoryRow[];
};

export function ScanHistory({ scans }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [pending, startTransition] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);

  function performDelete() {
    if (!confirmTarget) return;
    const id = confirmTarget.id;
    startTransition(async () => {
      const result = await deleteScan(id);
      if (!result.ok) {
        toast.error(result.error);
        setConfirmTarget(null);
        return;
      }
      toast.success("Scan deleted");
      setConfirmTarget(null);
      router.refresh();
    });
  }

  if (scans.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center py-10 text-center">
        <div className="mb-2 rounded-xl bg-white/[0.04] p-3">
          <ClockCounterClockwise
            className="h-5 w-5 text-white/40"
            weight="duotone"
          />
        </div>
        <p className="text-xs text-white/40">
          No scans yet. Run your first scan above.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <table className="w-full text-sm">
        <caption className="sr-only">Recent network scans</caption>
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
            <th scope="col" className="px-4 py-3 font-medium">
              Subnet
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Found
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Duration
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              When
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {scans.map((scan) => {
            const isFailed = scan.status === "failed";
            const isCancelled = scan.status === "cancelled";
            const isRunning =
              scan.status === "running" || scan.status === "pending";
            const when = scan.completedAt ?? scan.startedAt;

            return (
              <tr
                key={scan.id}
                className="transition-colors hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3 text-white">
                  <span className="mono">{scan.subnet}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={twMerge(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                      scan.status === "completed" &&
                        "bg-accent-green/15 text-accent-green",
                      isFailed && "bg-accent-red/15 text-accent-red",
                      isCancelled && "bg-white/[0.08] text-white/60",
                      isRunning && "bg-primary/15 text-primary",
                    )}
                  >
                    {scan.status === "completed" && (
                      <CheckCircle
                        className="h-3 w-3"
                        weight="duotone"
                        aria-hidden
                      />
                    )}
                    {isFailed && (
                      <WarningCircle
                        className="h-3 w-3"
                        weight="duotone"
                        aria-hidden
                      />
                    )}
                    {isCancelled && (
                      <Prohibit
                        className="h-3 w-3"
                        weight="duotone"
                        aria-hidden
                      />
                    )}
                    {isRunning && (
                      <CircleNotch
                        className={`h-3 w-3 ${reduceMotion ? "" : "animate-spin"}`}
                        weight="duotone"
                        aria-hidden
                      />
                    )}
                    {STATUS_LABELS[scan.status] ?? scan.status}
                  </span>
                  {isFailed && scan.error && (
                    <div className="mt-1 max-w-sm truncate text-[10px] text-accent-red/70">
                      {scan.error}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {scan.status === "completed" ? (
                    <div className="flex items-baseline gap-2">
                      <span className="mono text-white">{scan.hostsFound}</span>
                      <span className="text-xs text-white/40">
                        <span className="mono">{scan.hostsNew}</span> new ·{" "}
                        <span className="mono">{scan.hostsKnown}</span> known
                      </span>
                    </div>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-white/50">
                  {scan.duration != null ? (
                    <span className="mono">{scan.duration}s</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-white/50">
                  {when ? (
                    <span className="mono">
                      {new Date(when).toLocaleString()}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmTarget({ id: scan.id, subnet: scan.subnet })
                      }
                      disabled={pending || isRunning}
                      aria-label={`Delete scan for ${scan.subnet}`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-1 text-white/40 transition-colors hover:bg-accent-red/20 hover:text-accent-red disabled:opacity-30"
                      title="Delete scan"
                    >
                      <TrashSimple
                        className="h-3.5 w-3.5"
                        weight="bold"
                        aria-hidden
                      />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <DeleteConfirmDialog
        open={confirmTarget !== null}
        onClose={() => !pending && setConfirmTarget(null)}
        title="Delete scan record?"
        body={
          <p>
            Delete the scan record for{" "}
            <span className="mono text-white">{confirmTarget?.subnet}</span>?
            This only removes the history entry — any devices already imported
            from this scan stay in your inventory.
          </p>
        }
        confirmLabel="Delete scan"
        pending={pending}
        onConfirm={performDelete}
      />
    </div>
  );
}
