"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";
import { Trash2, History, AlertCircle, CheckCircle2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { deleteScan } from "@/app/(dashboard)/discovery/actions";

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
      <div className="glass-card flex flex-col items-center rounded-xl py-10 text-center">
        <div className="mb-2 rounded-xl bg-white/[0.04] p-3">
          <History className="h-5 w-5 text-white/40" />
        </div>
        <p className="text-xs text-white/40">
          No scans yet. Run your first scan above.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
            <th className="px-4 py-3 font-medium">Subnet</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Found</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {scans.map((scan) => {
            const isFailed = scan.status === "failed";
            const isRunning =
              scan.status === "running" || scan.status === "pending";
            const when = scan.completedAt ?? scan.startedAt;

            return (
              <tr
                key={scan.id}
                className="transition-colors hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3 font-mono text-white">
                  {scan.subnet}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={twMerge(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                      scan.status === "completed" &&
                        "bg-accent-green/15 text-accent-green",
                      isFailed && "bg-accent-red/15 text-accent-red",
                      isRunning && "bg-primary/15 text-primary",
                    )}
                  >
                    {scan.status === "completed" && (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {isFailed && <AlertCircle className="h-3 w-3" />}
                    {scan.status}
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
                      <span className="font-mono text-white">
                        {scan.hostsFound}
                      </span>
                      <span className="text-xs text-white/40">
                        {scan.hostsNew} new · {scan.hostsKnown} known
                      </span>
                    </div>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-white/50">
                  {scan.duration != null ? `${scan.duration}s` : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-white/50">
                  {when ? new Date(when).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() =>
                        setConfirmTarget({ id: scan.id, subnet: scan.subnet })
                      }
                      disabled={pending || isRunning}
                      className="rounded p-1 text-white/40 transition-colors hover:bg-accent-red/20 hover:text-accent-red disabled:opacity-30"
                      title="Delete scan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
            <span className="font-mono text-white">
              {confirmTarget?.subnet}
            </span>
            ? This only removes the history entry — any devices already imported
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
