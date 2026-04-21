"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  createDhcpRange,
  deleteDhcpRange,
} from "@/app/(dashboard)/network-tools/ipam/actions";
import type { DhcpRangeLite } from "./subnet-types";

type ConfirmTarget = { id: string; range: string } | null;

type Props = {
  subnetId: string;
  subnetCidr: string;
  dhcpRanges: DhcpRangeLite[];
};

export function DhcpRangeSection({ subnetId, subnetCidr, dhcpRanges }: Props) {
  const [adding, setAdding] = useState(false);
  const [startIp, setStartIp] = useState("");
  const [endIp, setEndIp] = useState("");
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createDhcpRange({
        subnetId,
        startIp: startIp.trim(),
        endIp: endIp.trim(),
        label: label.trim(),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("DHCP range added");
      setStartIp("");
      setEndIp("");
      setLabel("");
      setAdding(false);
    });
  };

  const performDelete = () => {
    if (!confirmTarget) return;
    const id = confirmTarget.id;
    startTransition(async () => {
      const result = await deleteDhcpRange(id);
      if (!result.ok) toast.error(result.error);
      else toast.success("Range deleted");
      setConfirmTarget(null);
    });
  };

  return (
    <section className="glass-card rounded-xl p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">DHCP ranges</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="glass-button flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add range
          </button>
        )}
      </div>

      {dhcpRanges.length === 0 && !adding && (
        <p className="text-sm text-white/50">
          No DHCP ranges on {subnetCidr}. Add one to mark a pool you hand out
          leases from.
        </p>
      )}

      {dhcpRanges.length > 0 && (
        <ul className="divide-y divide-white/[0.05]">
          {dhcpRanges.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div>
                <div className="font-mono text-sm text-white">
                  {r.startIp} – {r.endIp}
                </div>
                {r.label && (
                  <div className="text-xs text-white/50">{r.label}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfirmTarget({
                    id: r.id,
                    range: `${r.startIp}–${r.endIp}`,
                  })
                }
                aria-label={`Delete DHCP range ${r.startIp}-${r.endIp}`}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-white/40 hover:bg-white/[0.06] hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form
          onSubmit={submit}
          className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <input
            type="text"
            value={startIp}
            onChange={(e) => setStartIp(e.target.value)}
            className="glass-input rounded-lg px-3 py-2 font-mono text-sm"
            placeholder="Start IP"
            aria-label="Start IP"
            required
            maxLength={45}
          />
          <input
            type="text"
            value={endIp}
            onChange={(e) => setEndIp(e.target.value)}
            className="glass-input rounded-lg px-3 py-2 font-mono text-sm"
            placeholder="End IP"
            aria-label="End IP"
            required
            maxLength={45}
          />
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="glass-input rounded-lg px-3 py-2 text-sm"
            placeholder="Label (optional)"
            aria-label="Label (optional)"
            maxLength={100}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="glass-button rounded-lg px-3 py-2 text-xs font-medium text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Add"}
            </button>
          </div>
        </form>
      )}

      <DeleteConfirmDialog
        open={confirmTarget !== null}
        onClose={() => !pending && setConfirmTarget(null)}
        title="Delete DHCP range?"
        body={
          <p>
            Delete the DHCP range{" "}
            <span className="font-mono text-white">{confirmTarget?.range}</span>
            ? This removes the pool record — the subnet and any IP assignments
            are not affected.
          </p>
        }
        confirmLabel="Delete range"
        pending={pending}
        onConfirm={performDelete}
      />
    </section>
  );
}
