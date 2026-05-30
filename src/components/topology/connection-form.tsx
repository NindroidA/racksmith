"use client";

import {
  useEffect,
  useId,
  useMemo,
  useReducer,
  useState,
  useTransition,
} from "react";
import toast from "react-hot-toast";
import { X } from "@phosphor-icons/react/dist/ssr";
import { twMerge } from "tailwind-merge";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Select, SelectOption } from "@/components/ui/select";
import { useOrgAction } from "@/hooks/use-org-action";
import {
  createConnection,
  updateConnection,
  deleteConnection,
} from "@/app/(dashboard)/topology/actions";
import type { ConnectionInput } from "@/lib/validators";

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

type FormAction =
  | { type: "set"; field: keyof FormState; value: string }
  | { type: "reset"; state: FormState };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "set":
      return { ...state, [action.field]: action.value };
    case "reset":
      return action.state;
    default:
      return state;
  }
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
  const [deleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const titleId = useId();
  const run = useOrgAction(startTransition);
  const runDelete = useOrgAction(startDelete);

  // Build the initial form shape once per existing/prefilled change. The
  // reducer holds all eight fields as one object; the effect below dispatches
  // a single reset when the dialog reopens with fresh props.
  const initial = useMemo(
    () => buildInitialState(existing, prefilled),
    [existing, prefilled],
  );

  const [form, dispatch] = useReducer(formReducer, initial);
  const setField = (field: keyof FormState) => (value: string) =>
    dispatch({ type: "set", field, value });

  // Reset when dialog reopens with new context
  useEffect(() => {
    if (!open) return;
    dispatch({ type: "reset", state: initial });
    setSubmitAttempted(false);
  }, [open, initial]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!form.sourceDeviceId || !form.targetDeviceId) {
      toast.error("Pick both a source and target device");
      return;
    }
    const input: ConnectionInput = {
      sourceDeviceId: form.sourceDeviceId,
      sourcePort: form.sourcePort.trim(),
      targetDeviceId: form.targetDeviceId,
      targetPort: form.targetPort.trim(),
      cableType: form.cableType as ConnectionInput["cableType"],
      bandwidth: form.bandwidth.trim() || null,
      vlan: form.vlan.trim() || null,
      description: form.description.trim(),
      cableLengthFt: null,
    };

    // The dialog's parent owns the data refresh via `onSaved`; skip
    // router.refresh so we don't double-fetch.
    const onOk = () => {
      onSaved?.();
      onClose();
    };
    if (existing) {
      run(() => updateConnection(existing.id, input), {
        okMessage: "Connection updated",
        noRefresh: true,
        onSuccess: onOk,
      });
    } else {
      run(() => createConnection(input), {
        okMessage: "Connection created",
        noRefresh: true,
        onSuccess: onOk,
      });
    }
  }

  function performDelete() {
    if (!existing) return;
    runDelete(() => deleteConnection(existing.id), {
      okMessage: "Connection deleted",
      noRefresh: true,
      onSuccess: () => {
        setConfirmOpen(false);
        onSaved?.();
        onClose();
      },
      onError: () => setConfirmOpen(false),
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        labelledBy={titleId}
        size="xl"
        pending={pending || deleting}
      >
        <div className="p-6">
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
              <X className="h-4 w-4" weight="bold" aria-hidden />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            autoComplete="off"
          >
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
                  value={form.sourceDeviceId}
                  onValueChange={setField("sourceDeviceId")}
                  disabled={!!existing}
                  placeholder="Pick source…"
                  aria-invalid={submitAttempted && !form.sourceDeviceId}
                  aria-describedby={
                    submitAttempted && !form.sourceDeviceId
                      ? "conn-source-error"
                      : undefined
                  }
                >
                  {devices.map((d) => (
                    <SelectOption key={d.id} value={d.id}>
                      {d.name}
                    </SelectOption>
                  ))}
                </Select>
                {submitAttempted && !form.sourceDeviceId && (
                  <p
                    id="conn-source-error"
                    role="alert"
                    className="mt-1 text-xs text-accent-red"
                  >
                    Pick a source device.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Port
                </label>
                <input
                  type="text"
                  value={form.sourcePort}
                  onChange={(e) => setField("sourcePort")(e.target.value)}
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
                  value={form.targetDeviceId}
                  onValueChange={setField("targetDeviceId")}
                  disabled={!!existing}
                  placeholder="Pick target…"
                  aria-invalid={submitAttempted && !form.targetDeviceId}
                  aria-describedby={
                    submitAttempted && !form.targetDeviceId
                      ? "conn-target-error"
                      : undefined
                  }
                >
                  {devices
                    .filter((d) => d.id !== form.sourceDeviceId)
                    .map((d) => (
                      <SelectOption key={d.id} value={d.id}>
                        {d.name}
                      </SelectOption>
                    ))}
                </Select>
                {submitAttempted && !form.targetDeviceId && (
                  <p
                    id="conn-target-error"
                    role="alert"
                    className="mt-1 text-xs text-accent-red"
                  >
                    Pick a target device.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Port
                </label>
                <input
                  type="text"
                  value={form.targetPort}
                  onChange={(e) => setField("targetPort")(e.target.value)}
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
                  value={form.cableType}
                  onValueChange={setField("cableType")}
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
                <Select
                  value={form.bandwidth}
                  onValueChange={setField("bandwidth")}
                >
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
                  value={form.vlan}
                  onChange={(e) => setField("vlan")(e.target.value)}
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
                value={form.description}
                onChange={(e) => setField("description")(e.target.value)}
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
      </Dialog>

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
    </>
  );
}
