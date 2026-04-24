"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";
import { Check, X, Link2, CircleCheckBig } from "lucide-react";
import { DEVICE_TYPE_LABELS, type DeviceType } from "@/types";
import { Select, SelectOption } from "@/components/ui/select";
import {
  approveDiscovery,
  assignToExistingDevice,
  ignoreDiscovery,
} from "@/app/(dashboard)/discovery/actions";

export type PendingHost = {
  ip: string;
  hostname: string | null;
  mac: string | null;
  osGuess: string | null;
  openPorts: number[];
  scanId: string;
  scanSubnet: string;
  typeGuess: string;
  match:
    | { kind: "known"; deviceId: string; deviceName: string }
    | { kind: "new" };
  actionState: "pending" | "approved" | "assigned" | "ignored";
};

export type InventoryOption = {
  id: string;
  name: string;
  manufacturer: string;
  deviceType: string;
};

type Props = {
  hosts: PendingHost[];
  devices: InventoryOption[];
};

export function PendingDevicesTable({ hosts, devices }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [assignTarget, setAssignTarget] = useState<string | null>(null);

  function handleApprove(host: PendingHost) {
    startTransition(async () => {
      const result = await approveDiscovery(host.scanId, host.ip);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added ${host.hostname || host.ip} to inventory`);
      router.refresh();
    });
  }

  function handleAssign(host: PendingHost, deviceId: string) {
    startTransition(async () => {
      const result = await assignToExistingDevice(
        host.scanId,
        host.ip,
        deviceId,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Assigned to existing device");
      setAssignTarget(null);
      router.refresh();
    });
  }

  function handleIgnore(host: PendingHost) {
    startTransition(async () => {
      const result = await ignoreDiscovery(host.scanId, host.ip);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Ignored");
      router.refresh();
    });
  }

  if (hosts.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center rounded-xl py-12 text-center">
        <div className="mb-3 rounded-xl bg-accent-green/20 p-3">
          <CircleCheckBig className="h-6 w-6 text-accent-green" />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-white">
          No pending hosts
        </h3>
        <p className="max-w-sm text-xs text-white/50">
          All discovered hosts have been approved, assigned, or ignored. Run
          another scan to find more.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Hostname</th>
              <th className="px-4 py-3 font-medium">Type (guess)</th>
              <th className="px-4 py-3 font-medium">Open Ports</th>
              <th className="px-4 py-3 font-medium">From Scan</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {hosts.map((host) => {
              const typeLabel =
                DEVICE_TYPE_LABELS[host.typeGuess as DeviceType] ||
                host.typeGuess;
              const isAssigning = assignTarget === host.ip;

              return (
                <tr
                  key={`${host.scanId}-${host.ip}`}
                  className="transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-mono text-white">{host.ip}</td>
                  <td className="px-4 py-3 text-white/80">
                    {host.hostname || <span className="text-white/30">—</span>}
                    {host.mac && (
                      <div className="mt-0.5 font-mono text-[10px] text-white/40">
                        {host.mac}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">{typeLabel}</td>
                  <td className="px-4 py-3">
                    {host.openPorts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {host.openPorts.slice(0, 6).map((p) => (
                          <span
                            key={p}
                            className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/60"
                          >
                            {p}
                          </span>
                        ))}
                        {host.openPorts.length > 6 && (
                          <span className="px-1 text-[10px] text-white/40">
                            +{host.openPorts.length - 6}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-white/30">none</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/50">
                    {host.scanSubnet}
                  </td>
                  <td className="px-4 py-3">
                    {isAssigning ? (
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value=""
                          onValueChange={(v) => {
                            if (v) handleAssign(host, v);
                          }}
                          placeholder="Pick device…"
                          className="px-2 py-1 text-xs"
                        >
                          {devices.map((d) => (
                            <SelectOption key={d.id} value={d.id}>
                              {d.name}
                            </SelectOption>
                          ))}
                        </Select>
                        <button
                          onClick={() => setAssignTarget(null)}
                          className="text-xs text-white/50 hover:text-white/80"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleApprove(host)}
                          disabled={pending}
                          className="flex items-center gap-1 rounded-md bg-accent-green/20 px-2 py-1 text-xs font-medium text-accent-green hover:bg-accent-green/30 disabled:opacity-50"
                          title="Add as new device to inventory"
                        >
                          <Check className="h-3 w-3" />
                          Add
                        </button>
                        <button
                          onClick={() => setAssignTarget(host.ip)}
                          disabled={pending || devices.length === 0}
                          className={twMerge(
                            "flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/[0.12]",
                            (pending || devices.length === 0) && "opacity-40",
                          )}
                          title="Assign to an existing device"
                        >
                          <Link2 className="h-3 w-3" />
                          Assign
                        </button>
                        <button
                          onClick={() => handleIgnore(host)}
                          disabled={pending}
                          className="flex items-center gap-1 rounded-md bg-white/[0.03] px-2 py-1 text-xs font-medium text-white/60 hover:bg-white/[0.08] hover:text-white/90 disabled:opacity-50"
                          title="Ignore this host"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary of known (already in inventory) hosts — helpful to show */}
      {hosts.some((h) => h.match.kind === "known") && (
        <div className="border-t border-white/[0.05] bg-white/[0.02] px-4 py-2 text-xs text-white/50">
          <Link
            href="/devices"
            className="underline underline-offset-2 hover:text-white/80"
          >
            View {hosts.filter((h) => h.match.kind === "known").length} matched
            devices in inventory →
          </Link>
        </div>
      )}
    </div>
  );
}
