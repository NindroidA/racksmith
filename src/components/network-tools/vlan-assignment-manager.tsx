"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";
import { Plus, Trash2, X } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  assignVlanToDevice,
  removeVlanAssignment,
} from "@/app/(dashboard)/network-tools/vlans/actions";
import { VLAN_ASSIGN_MODES } from "@/lib/validators";

type ConfirmTarget = { id: string; label: string } | null;

type Mode = (typeof VLAN_ASSIGN_MODES)[number];

export type VlanAssignmentRow = {
  id: string;
  mode: string;
  portNumber: number | null;
  tagged: boolean;
  device: {
    id: string;
    name: string;
    deviceType: string;
    portCount: number;
  };
};

type DeviceOption = {
  id: string;
  name: string;
  deviceType: string;
  portCount: number;
};

type Props = {
  vlanRowId: string;
  devices: DeviceOption[];
  assignments: VlanAssignmentRow[];
};

export function VlanAssignmentManager({
  vlanRowId,
  devices,
  assignments,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [mode, setMode] = useState<Mode>("access");
  const [portNumber, setPortNumber] = useState("");
  const [tagged, setTagged] = useState(true);
  const [pending, startTransition] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId) {
      toast.error("Pick a device first");
      return;
    }
    startTransition(async () => {
      const port = portNumber.trim();
      const result = await assignVlanToDevice({
        vlanId: vlanRowId,
        deviceId,
        mode,
        portNumber: port ? parseInt(port, 10) || null : null,
        tagged,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("VLAN assigned");
      setDeviceId("");
      setPortNumber("");
      setMode("access");
      setTagged(true);
      setAdding(false);
    });
  };

  const performRemove = () => {
    if (!confirmTarget) return;
    const id = confirmTarget.id;
    startTransition(async () => {
      const result = await removeVlanAssignment(id);
      if (!result.ok) {
        toast.error(result.error);
        setConfirmTarget(null);
        return;
      }
      toast.success("Assignment removed");
      setConfirmTarget(null);
    });
  };

  return (
    <section className="glass-card rounded-xl p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Device assignments</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={devices.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Assign to device
          </button>
        )}
      </div>

      {devices.length === 0 && (
        <p className="text-sm text-white/50">
          Add a switch / router / firewall to your device inventory first.
        </p>
      )}

      {adding && (
        <form
          onSubmit={submit}
          className="mb-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">New assignment</h3>
            <button
              type="button"
              onClick={() => setAdding(false)}
              aria-label="Cancel"
              className="rounded p-1 text-white/40 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_100px_auto]">
            <div>
              <label
                htmlFor="vlan-assign-device"
                className="mb-1 block text-xs text-white/50"
              >
                Device
              </label>
              <select
                id="vlan-assign-device"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 text-sm"
              >
                <option value="" className="bg-neutral-900">
                  (pick a device)
                </option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id} className="bg-neutral-900">
                    {d.name} ({d.deviceType})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="vlan-assign-mode"
                className="mb-1 block text-xs text-white/50"
              >
                Mode
              </label>
              <select
                id="vlan-assign-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                className="glass-input w-full rounded-lg px-3 py-2 text-sm capitalize"
              >
                {VLAN_ASSIGN_MODES.map((m) => (
                  <option key={m} value={m} className="bg-neutral-900">
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="vlan-assign-port"
                className="mb-1 block text-xs text-white/50"
              >
                Port
              </label>
              <input
                id="vlan-assign-port"
                type="number"
                value={portNumber}
                onChange={(e) => setPortNumber(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 font-mono text-sm"
                placeholder="all"
                aria-label="Port number (optional)"
                min={1}
                max={1000}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {pending ? "Saving..." : "Assign"}
              </button>
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={tagged}
              onChange={(e) => setTagged(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-primary"
            />
            Tagged (802.1Q)
          </label>
        </form>
      )}

      {assignments.length === 0 ? (
        <p className="text-sm text-white/50">
          No devices assigned yet. Assign this VLAN to every switch that needs
          it — orphan VLANs produce warnings on the overview page.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {assignments.map((a) => {
            const label = a.portNumber
              ? `${a.device.name} · port ${a.portNumber}`
              : a.device.name;
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div>
                  <Link
                    href={`/devices/${a.device.id}`}
                    className="font-medium text-white hover:text-primary"
                  >
                    {a.device.name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/50">
                    <span
                      className={twMerge(
                        "rounded px-1.5 py-0.5 capitalize",
                        a.mode === "trunk"
                          ? "bg-accent-blue/15 text-accent-blue"
                          : a.mode === "native"
                            ? "bg-accent-orange/15 text-accent-orange"
                            : "bg-white/[0.06] text-white/70",
                      )}
                    >
                      {a.mode}
                    </span>
                    {a.portNumber && (
                      <span className="font-mono">port {a.portNumber}</span>
                    )}
                    <span>{a.tagged ? "tagged" : "untagged"}</span>
                    <span className="text-white/30">{a.device.deviceType}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmTarget({ id: a.id, label })}
                  aria-label={`Remove assignment from ${label}`}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-white/40 hover:bg-white/[0.06] hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <DeleteConfirmDialog
        open={confirmTarget !== null}
        onClose={() => !pending && setConfirmTarget(null)}
        title="Remove VLAN assignment?"
        body={
          <p>
            Remove the VLAN assignment from{" "}
            <span className="font-medium text-white">
              {confirmTarget?.label}
            </span>
            ? The device stays in your inventory — only its link to this VLAN is
            removed.
          </p>
        }
        confirmLabel="Remove assignment"
        pending={pending}
        onConfirm={performRemove}
      />
    </section>
  );
}
