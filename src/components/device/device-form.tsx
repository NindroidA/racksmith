"use client";

import { useReducer, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { twMerge } from "tailwind-merge";
import { ArrowLeft, Save, Trash2, Eye } from "lucide-react";
import { DEVICE_TYPE_LABELS, type DeviceType } from "@/types";
import { DeviceGraphic, U_ASPECT } from "@/components/rack/device-graphic";
import { InlineHelp } from "@/components/ui/inline-help";
import { AdvancedAccordion } from "@/components/ui/advanced-accordion";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Select, SelectOption } from "@/components/ui/select";
import { useOrgAction } from "@/hooks/use-org-action";
import {
  createDevice,
  updateDevice,
  deleteDevice,
} from "@/app/(dashboard)/devices/actions";
import type { DeviceInput } from "@/lib/validators";

type FormState = {
  name: string;
  deviceType: DeviceType;
  manufacturer: string;
  model: string;
  sizeU: number;
  portCount: number;
  powerWatts: string;
  ipAddress: string;
  macAddress: string;
  hostname: string;
  notes: string;
  rackId: string;
  positionU: string;
};

type FormAction =
  | { type: "set"; payload: Partial<FormState> }
  | { type: "reset"; state: FormState };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "set":
      return { ...state, ...action.payload };
    case "reset":
      return action.state;
  }
}

function buildInitial(initial?: Partial<DeviceInput>): FormState {
  return {
    name: initial?.name ?? "",
    deviceType: (initial?.deviceType as DeviceType) ?? "switch",
    manufacturer: initial?.manufacturer ?? "",
    model: initial?.model ?? "",
    sizeU: initial?.sizeU ?? 1,
    portCount: initial?.portCount ?? 0,
    powerWatts: initial?.powerWatts != null ? String(initial.powerWatts) : "",
    ipAddress: initial?.ipAddress ?? "",
    macAddress: initial?.macAddress ?? "",
    hostname: initial?.hostname ?? "",
    notes: initial?.notes ?? "",
    rackId: initial?.rackId ?? "",
    positionU: initial?.positionU != null ? String(initial.positionU) : "",
  };
}

type RackOption = { id: string; name: string; sizeU: number };

type Props =
  | {
      mode: "create";
      initial?: Partial<DeviceInput>;
      deviceId?: undefined;
      racks: RackOption[];
    }
  | {
      mode: "edit";
      initial: DeviceInput;
      deviceId: string;
      racks: RackOption[];
    };

const DEVICE_TYPE_OPTIONS: DeviceType[] = [
  "router",
  "switch",
  "server",
  "firewall",
  "storage",
  "ups",
  "pdu",
  "patch_panel",
  "other",
];

const MANUFACTURER_OPTIONS = [
  "cisco",
  "ubiquiti",
  "dell",
  "hp",
  "juniper",
  "arista",
  "fs",
  "tripplite",
  "custom",
];

export function DeviceForm(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const run = useOrgAction(startTransition);
  const runDelete = useOrgAction(startDelete);

  const [form, dispatch] = useReducer(formReducer, props.initial, buildInitial);
  const {
    name,
    deviceType,
    manufacturer,
    model,
    sizeU,
    portCount,
    powerWatts,
    ipAddress,
    macAddress,
    hostname,
    notes,
    rackId,
    positionU,
  } = form;
  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    dispatch({
      type: "set",
      payload: { [field]: value } as Partial<FormState>,
    });

  // Live preview DeviceGraphic from current form state
  const preview = useMemo(
    () => (
      <DeviceGraphic
        deviceType={deviceType}
        manufacturer={manufacturer || "custom"}
        model={model}
        sizeU={sizeU}
        portCount={portCount}
      />
    ),
    [deviceType, manufacturer, model, sizeU, portCount],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedPower = powerWatts.trim();
    const trimmedPos = positionU.trim();
    const input: DeviceInput = {
      name: name.trim(),
      deviceType,
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      sizeU,
      portCount,
      powerWatts: trimmedPower === "" ? null : parseInt(trimmedPower) || null,
      notes: notes.trim(),
      ipAddress: ipAddress.trim() || null,
      macAddress: macAddress.trim() || null,
      hostname: hostname.trim() || null,
      rackId: rackId || null,
      positionU:
        rackId && trimmedPos !== "" ? parseInt(trimmedPos) || null : null,
    };

    if (props.mode === "create") {
      run(() => createDevice(input), {
        okMessage: "Device created",
        noRefresh: true,
        onSuccess: (data) => router.push(`/devices/${data.id}`),
      });
    } else {
      run(() => updateDevice(props.deviceId, input), {
        okMessage: "Device updated",
        onSuccess: () => router.push(`/devices/${props.deviceId}`),
      });
    }
  }

  function performDelete() {
    if (props.mode !== "edit") return;
    runDelete(() => deleteDevice(props.deviceId), {
      okMessage: "Device deleted",
      noRefresh: true,
      onSuccess: () => router.push("/devices"),
      onError: () => setConfirmOpen(false),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="mx-auto max-w-5xl"
    >
      <Link
        href={props.mode === "edit" ? `/devices/${props.deviceId}` : "/devices"}
        className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {props.mode === "create" ? "New Device" : "Edit Device"}
        </h1>
        <p className="mt-1 text-white/60">
          {props.mode === "create"
            ? "Add a device to your inventory"
            : "Update device specs and placement"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="glass-card space-y-6 rounded-xl p-6">
          {/* Name + Type */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_200px]">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                Name <span className="text-accent-red">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => set("name", e.target.value)}
                className="glass-input w-full rounded-lg px-4 py-2.5 text-sm"
                placeholder="e.g. Main Switch, firewall-01"
                required
                maxLength={100}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </div>
            <div>
              <label
                htmlFor="deviceType"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                Type <span className="text-accent-red">*</span>
              </label>
              <Select
                id="deviceType"
                value={deviceType}
                onValueChange={(v) => set("deviceType", v as DeviceType)}
              >
                {DEVICE_TYPE_OPTIONS.map((t) => (
                  <SelectOption key={t} value={t}>
                    {DEVICE_TYPE_LABELS[t]}
                  </SelectOption>
                ))}
              </Select>
            </div>
          </div>

          {/* Manufacturer + Model */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="manufacturer"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                Manufacturer
              </label>
              <Select
                id="manufacturer"
                value={manufacturer.toLowerCase()}
                onValueChange={(v) => set("manufacturer", v)}
                placeholder="(none)"
              >
                <SelectOption value="">(none)</SelectOption>
                {MANUFACTURER_OPTIONS.map((m) => (
                  <SelectOption key={m} value={m}>
                    {m}
                  </SelectOption>
                ))}
              </Select>
            </div>
            <div>
              <label
                htmlFor="model"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                Model
              </label>
              <input
                id="model"
                type="text"
                value={model}
                onChange={(e) => set("model", e.target.value)}
                className="glass-input w-full rounded-lg px-4 py-2.5 text-sm"
                placeholder="e.g. C9300-48P"
                maxLength={100}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </div>
          </div>

          {/* Size + Ports + Power */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <InlineHelp htmlFor="sizeU" term="RACK_UNIT">
                Size (U)
              </InlineHelp>
              <input
                id="sizeU"
                type="number"
                value={sizeU}
                onChange={(e) =>
                  set("sizeU", Math.max(1, parseInt(e.target.value) || 1))
                }
                className="glass-input w-full rounded-lg px-4 py-2.5 text-sm"
                min={1}
                max={20}
              />
            </div>
            <div>
              <label
                htmlFor="portCount"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                Ports
              </label>
              <input
                id="portCount"
                type="number"
                value={portCount}
                onChange={(e) =>
                  set("portCount", Math.max(0, parseInt(e.target.value) || 0))
                }
                className="glass-input w-full rounded-lg px-4 py-2.5 text-sm"
                min={0}
                max={1000}
              />
            </div>
            <div>
              <label
                htmlFor="powerWatts"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                Power (W)
              </label>
              <input
                id="powerWatts"
                type="number"
                value={powerWatts}
                onChange={(e) => set("powerWatts", e.target.value)}
                className="glass-input w-full rounded-lg px-4 py-2.5 text-sm"
                min={0}
                max={100000}
                placeholder="optional"
              />
            </div>
          </div>

          <AdvancedAccordion
            label="Network details (optional)"
            defaultOpen={Boolean(
              props.initial?.ipAddress ||
              props.initial?.macAddress ||
              props.initial?.hostname,
            )}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <InlineHelp htmlFor="ipAddress" term="IP">
                  IP Address
                </InlineHelp>
                <input
                  id="ipAddress"
                  type="text"
                  value={ipAddress}
                  onChange={(e) => set("ipAddress", e.target.value)}
                  className="glass-input w-full rounded-lg px-4 py-2.5 font-mono text-sm"
                  placeholder="192.168.1.1"
                  maxLength={45}
                  autoComplete="off"
                  data-1p-ignore
                />
              </div>
              <div>
                <InlineHelp htmlFor="macAddress" term="MAC">
                  MAC Address
                </InlineHelp>
                <input
                  id="macAddress"
                  type="text"
                  value={macAddress}
                  onChange={(e) => set("macAddress", e.target.value)}
                  className="glass-input w-full rounded-lg px-4 py-2.5 font-mono text-sm"
                  placeholder="aa:bb:cc:dd:ee:ff"
                  maxLength={17}
                  autoComplete="off"
                  data-1p-ignore
                />
              </div>
              <div>
                <InlineHelp htmlFor="hostname" term="HOSTNAME">
                  Hostname
                </InlineHelp>
                <input
                  id="hostname"
                  type="text"
                  value={hostname}
                  onChange={(e) => set("hostname", e.target.value)}
                  className="glass-input w-full rounded-lg px-4 py-2.5 font-mono text-sm"
                  placeholder="switch-01"
                  maxLength={255}
                  autoComplete="off"
                  data-1p-ignore
                />
              </div>
            </div>
          </AdvancedAccordion>

          <AdvancedAccordion
            label="Rack placement (optional)"
            defaultOpen={Boolean(props.initial?.rackId)}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_120px]">
              <div>
                <label
                  htmlFor="rackId"
                  className="mb-1.5 block text-sm font-medium text-white/70"
                >
                  Rack
                </label>
                <Select
                  id="rackId"
                  value={rackId}
                  onValueChange={(v) => set("rackId", v)}
                  placeholder="Unracked"
                >
                  <SelectOption value="">Unracked</SelectOption>
                  {props.racks.map((r) => (
                    <SelectOption key={r.id} value={r.id}>
                      {r.name} ({r.sizeU}U)
                    </SelectOption>
                  ))}
                </Select>
              </div>
              <div>
                <label
                  htmlFor="positionU"
                  className="mb-1.5 block text-sm font-medium text-white/70"
                >
                  Position (U)
                </label>
                <input
                  id="positionU"
                  type="number"
                  value={positionU}
                  onChange={(e) => set("positionU", e.target.value)}
                  className="glass-input w-full rounded-lg px-4 py-2.5 text-sm disabled:opacity-40"
                  min={1}
                  max={60}
                  disabled={!rackId}
                  placeholder="1"
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-white/40">
              Leave rack empty to add to unracked inventory. Position is the
              bottom U slot.
            </p>
          </AdvancedAccordion>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="mb-1.5 block text-sm font-medium text-white/70"
            >
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => set("notes", e.target.value)}
              className="glass-input w-full resize-none rounded-lg px-4 py-2.5 text-sm"
              rows={3}
              placeholder="Any additional notes about this device"
              maxLength={1000}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>
        </div>

        {/* Live preview sidebar */}
        <div className="flex flex-col gap-4">
          <div className="glass-card rounded-xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Live Preview
              </h3>
            </div>
            <div
              className="overflow-hidden rounded-md bg-black/40 p-1.5"
              style={{ aspectRatio: `${U_ASPECT} / ${sizeU}` }}
            >
              {preview}
            </div>
            <p className="mt-2 text-[11px] text-white/40">
              This is how the device will render in the rack.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between">
        {props.mode === "edit" ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting || pending}
            className={twMerge(
              "flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-2.5 text-sm font-medium text-accent-red transition-all hover:bg-accent-red/20 disabled:opacity-50",
            )}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting..." : "Delete Device"}
          </button>
        ) : (
          <div />
        )}

        <div className="flex gap-3">
          <Link
            href={
              props.mode === "edit" ? `/devices/${props.deviceId}` : "/devices"
            }
            className="glass-button rounded-lg px-4 py-2.5 text-sm font-medium text-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending || deleting}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {pending
              ? "Saving..."
              : props.mode === "create"
                ? "Create Device"
                : "Save Changes"}
          </button>
        </div>
      </div>

      {props.mode === "edit" && (
        <DeleteConfirmDialog
          open={confirmOpen}
          onClose={() => !deleting && setConfirmOpen(false)}
          title={`Delete ${name || "device"}?`}
          body={
            <p>
              This permanently removes the device and all of its connections,
              VLAN assignments, and IP reservations. This action cannot be
              undone.
            </p>
          }
          confirmLabel="Delete device"
          pending={deleting}
          onConfirm={performDelete}
        />
      )}
    </form>
  );
}
