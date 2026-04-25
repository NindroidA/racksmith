"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  useEffect,
} from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Select, SelectOption } from "@/components/ui/select";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  createConnection,
  updateConnection,
  deleteConnection,
} from "@/app/(dashboard)/topology/actions";
import type { ConnectionInput } from "@/lib/validators";
import { describeError } from "@/lib/error-message";

const CABLE_TYPES = [
  { value: "ethernet", label: "Ethernet (copper)" },
  { value: "fiber", label: "Fiber" },
  { value: "sfp", label: "SFP module" },
  { value: "dac", label: "DAC (direct attach)" },
  { value: "power", label: "Power" },
  { value: "other", label: "Other" },
];

const BANDWIDTH_PRESETS = [
  "",
  "100M",
  "1G",
  "2.5G",
  "10G",
  "25G",
  "40G",
  "100G",
];

type DeviceOption = { id: string; name: string };

type ExistingConnection = {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  sourcePort: string;
  targetPort: string;
  cableType: string;
  bandwidth: string | null;
  vlan: string | null;
  description: string;
};

type Prefilled = {
  sourceDeviceId: string;
  targetDeviceId: string;
};

type FormState = {
  sourceDeviceId: string;
  targetDeviceId: string;
  sourcePort: string;
  targetPort: string;
  cableType: string;
  bandwidth: string;
  vlan: string;
  description: string;
};

function buildInitialState(
  existing?: ExistingConnection,
  prefilled?: Prefilled,
): FormState {
  return {
    sourceDeviceId: existing?.sourceDeviceId ?? prefilled?.sourceDeviceId ?? "",
    targetDeviceId: existing?.targetDeviceId ?? prefilled?.targetDeviceId ?? "",
    sourcePort: existing?.sourcePort ?? "",
    targetPort: existing?.targetPort ?? "",
    cableType: existing?.cableType ?? "ethernet",
    bandwidth: existing?.bandwidth ?? "",
    vlan: existing?.vlan ?? "",
    description: existing?.description ?? "",
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  devices: DeviceOption[];
  /** If set, edit mode. Otherwise create mode. */
  existing?: ExistingConnection;
  /** Pre-fill for create mode (from React Flow's onConnect) */
  prefilled?: Prefilled;
  onSaved?: () => void;
};

export function ConnectionForm({
  open,
  onClose,
  devices,
  existing,
  prefilled,
  onSaved,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // Bail when a nested control (e.g. <Select> closing its listbox)
      // already consumed the Escape, otherwise we'd dismiss the dialog too.
      if (e.defaultPrevented) return;
      if (e.key === "Escape" && !pending && !deleting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, deleting, onClose]);

  // Build the initial form shape once per existing/prefilled change. The
  // eight useState slots below each pull from this memoized object; the
  // useEffect below resets them all to this object's current fields when
  // the dialog reopens with fresh props.
  const initial = useMemo(
    () => buildInitialState(existing, prefilled),
    [existing, prefilled],
  );

  const [sourceDeviceId, setSourceDeviceId] = useState(initial.sourceDeviceId);
  const [targetDeviceId, setTargetDeviceId] = useState(initial.targetDeviceId);
  const [sourcePort, setSourcePort] = useState(initial.sourcePort);
  const [targetPort, setTargetPort] = useState(initial.targetPort);
  const [cableType, setCableType] = useState(initial.cableType);
  const [bandwidth, setBandwidth] = useState(initial.bandwidth);
  const [vlan, setVlan] = useState(initial.vlan);
  const [description, setDescription] = useState(initial.description);

  // Reset when dialog reopens with new context
  useEffect(() => {
    if (!open) return;
    setSourceDeviceId(initial.sourceDeviceId);
    setTargetDeviceId(initial.targetDeviceId);
    setSourcePort(initial.sourcePort);
    setTargetPort(initial.targetPort);
    setCableType(initial.cableType);
    setBandwidth(initial.bandwidth);
    setVlan(initial.vlan);
    setDescription(initial.description);
  }, [open, initial]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceDeviceId || !targetDeviceId) {
      toast.error("Pick both a source and target device");
      return;
    }
    const input: ConnectionInput = {
      sourceDeviceId,
      sourcePort: sourcePort.trim(),
      targetDeviceId,
      targetPort: targetPort.trim(),
      cableType: cableType as ConnectionInput["cableType"],
      bandwidth: bandwidth.trim() || null,
      vlan: vlan.trim() || null,
      description: description.trim(),
      cableLengthFt: null,
    };

    startTransition(async () => {
      try {
        const result = existing
          ? await updateConnection(existing.id, input)
          : await createConnection(input);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(existing ? "Connection updated" : "Connection created");
        onSaved?.();
        onClose();
      } catch (err) {
        toast.error(describeError(err, "Something went wrong"));
      }
    });
  }

  async function performDelete() {
    if (!existing) return;
    setDeleting(true);
    try {
      const result = await deleteConnection(existing.id);
      if (!result.ok) {
        toast.error(result.error);
        setDeleting(false);
        setConfirmOpen(false);
        return;
      }
      toast.success("Connection deleted");
      setConfirmOpen(false);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(describeError(err, "Failed to delete"));
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => {
        if (!pending && !deleting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="glass-panel w-full max-w-xl rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold text-white">
            {existing ? "Edit Connection" : "New Connection"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Source */}
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div>
              <label
                htmlFor="conn-source-device"
                className="mb-1.5 block text-xs font-medium text-white/60"
              >
                Source Device
              </label>
              <Select
                id="conn-source-device"
                value={sourceDeviceId}
                onValueChange={setSourceDeviceId}
                disabled={!!existing}
                placeholder="Pick source…"
              >
                {devices.map((d) => (
                  <SelectOption key={d.id} value={d.id}>
                    {d.name}
                  </SelectOption>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">
                Port
              </label>
              <input
                type="text"
                value={sourcePort}
                onChange={(e) => setSourcePort(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 font-mono text-sm"
                placeholder="e.g. 1, Gi1/0/24"
                maxLength={50}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Target */}
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div>
              <label
                htmlFor="conn-target-device"
                className="mb-1.5 block text-xs font-medium text-white/60"
              >
                Target Device
              </label>
              <Select
                id="conn-target-device"
                value={targetDeviceId}
                onValueChange={setTargetDeviceId}
                disabled={!!existing}
                placeholder="Pick target…"
              >
                {devices
                  .filter((d) => d.id !== sourceDeviceId)
                  .map((d) => (
                    <SelectOption key={d.id} value={d.id}>
                      {d.name}
                    </SelectOption>
                  ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">
                Port
              </label>
              <input
                type="text"
                value={targetPort}
                onChange={(e) => setTargetPort(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 font-mono text-sm"
                placeholder="e.g. 1"
                maxLength={50}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Cable type + bandwidth + VLAN */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="conn-cable-type"
                className="mb-1.5 block text-xs font-medium text-white/60"
              >
                Cable Type
              </label>
              <Select
                id="conn-cable-type"
                value={cableType}
                onValueChange={setCableType}
              >
                {CABLE_TYPES.map((t) => (
                  <SelectOption key={t.value} value={t.value}>
                    {t.label}
                  </SelectOption>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">
                Bandwidth
              </label>
              <Select value={bandwidth} onValueChange={setBandwidth}>
                {BANDWIDTH_PRESETS.map((b) => (
                  <SelectOption key={b} value={b}>
                    {b || "(none)"}
                  </SelectOption>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">
                VLAN
              </label>
              <input
                type="text"
                value={vlan}
                onChange={(e) => setVlan(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 font-mono text-sm"
                placeholder="10"
                maxLength={50}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-input w-full rounded-lg px-3 py-2 text-sm"
              placeholder="Trunk uplink, patch cable to AP, etc."
              maxLength={500}
              autoComplete="off"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {existing ? (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={deleting || pending}
                className={twMerge(
                  "flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-xs font-medium text-accent-red transition-all hover:bg-accent-red/20 disabled:opacity-50",
                )}
              >
                {deleting ? "Deleting..." : "Delete Connection"}
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="glass-button rounded-lg px-3 py-2 text-xs font-medium text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || deleting}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {pending
                  ? "Saving..."
                  : existing
                    ? "Save Changes"
                    : "Create Connection"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {existing && (
        <DeleteConfirmDialog
          open={confirmOpen}
          onClose={() => !deleting && setConfirmOpen(false)}
          title="Delete connection?"
          body={
            <p>
              Remove the link between these two devices. This only deletes the
              connection record — the devices themselves stay in your inventory.
            </p>
          }
          confirmLabel="Delete connection"
          pending={deleting}
          onConfirm={performDelete}
        />
      )}
    </div>
  );
}
