"use client";

import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import toast from "react-hot-toast";
import { Copy, Check, FileCode, AlertTriangle } from "lucide-react";
import { Select, SelectOption } from "@/components/ui/select";
import {
  generateConfig,
  VENDOR_LABELS,
  type ConfigGenInput,
  type ConfigGenVendor,
} from "@/lib/config-gen";

type DeviceRow = {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  portCount: number;
};

type VlanRow = {
  id: string;
  vlanId: number;
  name: string;
  description: string;
  purpose: string;
  assignments: Array<{
    deviceId: string;
    portNumber: number | null;
    mode: string;
    tagged: boolean;
  }>;
};

const VENDORS: ConfigGenVendor[] = ["cisco-ios", "unifi", "hpe-aruba"];

type Props = {
  devices: DeviceRow[];
  vlans: VlanRow[];
};

export function ConfigGenClient({ devices, vlans }: Props) {
  const [deviceId, setDeviceId] = useState<string>(devices[0]?.id ?? "");
  const [vendor, setVendor] = useState<ConfigGenVendor>("cisco-ios");
  const [copied, setCopied] = useState(false);

  const selectedDevice = devices.find((d) => d.id === deviceId);

  const output = useMemo(() => {
    if (!selectedDevice) return null;
    const input: ConfigGenInput = {
      vendor,
      device: selectedDevice,
      vlans: vlans.map((v) => ({
        vlanId: v.vlanId,
        name: v.name,
        description: v.description,
        purpose: v.purpose,
      })),
      assignments: vlans.flatMap((v) =>
        v.assignments
          .filter((a) => a.deviceId === selectedDevice.id)
          .map((a) => ({
            vlanId: v.vlanId,
            vlanName: v.name,
            portNumber: a.portNumber,
            mode: (a.mode === "trunk" || a.mode === "native"
              ? a.mode
              : "access") as "access" | "trunk" | "native",
            tagged: a.tagged,
          })),
      ),
    };
    return generateConfig(input);
  }, [selectedDevice, vendor, vlans]);

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output.text);
      setCopied(true);
      toast.success("Config copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  if (devices.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <Heading />
        <div className="glass-card mt-6 rounded-2xl px-6 py-10 text-center">
          <div className="mb-4 inline-flex rounded-xl bg-accent-orange/20 p-4 text-accent-orange">
            <FileCode className="h-8 w-8" aria-hidden />
          </div>
          <h2 className="text-xl font-semibold text-white">
            No eligible devices
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
            Add at least one switch, router, or firewall to your inventory. This
            page can only generate configs for those device types.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Heading />

      <div className="glass-card grid grid-cols-1 gap-4 rounded-xl p-6 sm:grid-cols-[1fr_1fr]">
        <div>
          <label
            htmlFor="device"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Device
          </label>
          <Select id="device" value={deviceId} onValueChange={setDeviceId}>
            {devices.map((d) => (
              <SelectOption key={d.id} value={d.id}>
                {d.name}
                {d.manufacturer ? ` (${d.manufacturer})` : ""}
              </SelectOption>
            ))}
          </Select>
        </div>
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-white/70">
            Vendor
          </legend>
          <div
            role="tablist"
            aria-label="Config generator vendor"
            className="flex gap-1 rounded-lg bg-white/[0.04] p-0.5"
          >
            {VENDORS.map((v) => {
              const selected = vendor === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  id={`vendor-tab-${v}`}
                  aria-selected={selected}
                  aria-controls="vendor-output-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setVendor(v)}
                  className={twMerge(
                    "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50",
                    selected
                      ? "bg-white/[0.12] text-white"
                      : "text-white/50 hover:text-white/80",
                  )}
                >
                  {VENDOR_LABELS[v]}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {output && (
        <div
          id="vendor-output-panel"
          role="tabpanel"
          aria-labelledby={`vendor-tab-${output.vendor}`}
          className="glass-card rounded-xl"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-white">
                {VENDOR_LABELS[output.vendor]}
              </h2>
              <p className="mt-0.5 text-xs text-white/50">
                Paste-ready. Review before applying — this is a config preview,
                never applied to your devices.
              </p>
            </div>
            <button
              type="button"
              onClick={copy}
              className="glass-button flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-accent-green" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {output.warnings.length > 0 && (
            <div className="border-b border-white/[0.06] px-5 py-3">
              <ul className="space-y-1.5">
                {output.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-accent-orange"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-white/85">
            {output.text}
          </pre>
        </div>
      )}
    </div>
  );
}

function Heading() {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
        <FileCode className="h-7 w-7 text-accent-green" aria-hidden />
        Config Generator
      </h1>
      <p className="mt-1 text-white/60">
        Export VLAN + port configs for Cisco IOS, UniFi, or HPE Aruba. Paste
        into your device — RackSmith never applies config automatically.
      </p>
    </div>
  );
}
