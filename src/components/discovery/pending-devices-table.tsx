"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Check,
  X,
  LinkSimple,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr";
import { DEVICE_TYPE_LABELS, type DeviceType } from "@/types";
import { Button } from "@/components/ui/button";
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
  vendor: string | null;
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
        // Tier-cap denials carry a `limit` payload. Give the user a
        // longer-lived toast with an upgrade hint so they can act on it.
        if (result.limit) {
          toast.error(`${result.error} Upgrade your plan to add more.`, {
            duration: 6000,
          });
        } else {
          toast.error(result.error);
        }
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
      toast.success(
        `${host.hostname || host.ip} ignored — it won't appear unless you rescan.`,
      );
      router.refresh();
    });
  }

  // -sn (the default discovery scan) does not scan ports, so openPorts is
  // empty for every host. Only render the Open Ports column when at least
  // one host actually reported open ports — otherwise the column is a
  // misleading always-empty placeholder.
  const showPorts = hosts.some((h) => h.openPorts.length > 0);

  if (hosts.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center py-12 text-center">
        <div className="mb-3 rounded-xl bg-accent-green/20 p-3">
          <CheckCircle className="h-6 w-6 text-accent-green" weight="duotone" />
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
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
              <th scope="col" className="px-4 py-3 font-medium">
                IP
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Hostname / MAC
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Vendor
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Type (guess)
              </th>
              {showPorts && (
                <th scope="col" className="px-4 py-3 font-medium">
                  Open Ports
                </th>
              )}
              <th scope="col" className="px-4 py-3 font-medium">
                From Scan
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Action
              </th>
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
                  <td className="px-4 py-3 text-white">
                    <span className="mono">{host.ip}</span>
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    {host.hostname || <span className="text-white/30">—</span>}
                    {host.mac && (
                      <div className="mono mt-0.5 text-[10px] text-white/40">
                        {host.mac}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {host.vendor || <span className="text-white/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-white/70">{typeLabel}</td>
                  {showPorts && (
                    <td className="px-4 py-3">
                      {host.openPorts.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {host.openPorts.slice(0, 6).map((p) => (
                            <span
                              key={p}
                              className="mono rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/60"
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
                  )}
                  <td className="px-4 py-3 text-xs text-white/50">
                    <span className="mono">{host.scanSubnet}</span>
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
                          aria-label={`Assign ${host.ip} to existing device`}
                        >
                          {devices.map((d) => (
                            <SelectOption key={d.id} value={d.id}>
                              {d.name}
                            </SelectOption>
                          ))}
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAssignTarget(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(host)}
                          disabled={pending}
                          aria-label={`Add ${host.ip} to inventory`}
                          title="Add as new device to inventory"
                          iconLeft={
                            <Check
                              className="h-3 w-3"
                              weight="bold"
                              aria-hidden
                            />
                          }
                        >
                          Add
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setAssignTarget(host.ip)}
                          disabled={pending || devices.length === 0}
                          aria-label={
                            devices.length === 0
                              ? `Cannot assign ${host.ip} — no devices in inventory`
                              : `Assign ${host.ip} to existing device`
                          }
                          title={
                            devices.length === 0
                              ? "No devices in inventory to assign to"
                              : "Assign to an existing device"
                          }
                          iconLeft={
                            <LinkSimple
                              className="h-3 w-3"
                              weight="bold"
                              aria-hidden
                            />
                          }
                        >
                          Assign
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleIgnore(host)}
                          disabled={pending}
                          aria-label={`Ignore ${host.ip}`}
                          title="Ignore this host"
                        >
                          <X className="h-3 w-3" weight="bold" aria-hidden />
                        </Button>
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
