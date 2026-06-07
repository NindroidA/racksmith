"use client";

import { useMemo } from "react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";
import { Warning } from "@phosphor-icons/react/dist/ssr";
import { COLOR_TAG_MAP, type ColorTag } from "@/types";

type VlanRow = {
  id: string;
  vlanId: number;
  name: string;
  colorTag: string;
  purpose: string;
  subnetCount: number;
  assignmentCount: number;
  deviceIds: string[];
};

type SwitchRow = {
  id: string;
  name: string;
  deviceType: string;
  manufacturer: string;
  portCount: number;
};

type Props = {
  vlans: VlanRow[];
  switches: SwitchRow[];
};

export function VlanMatrix({ vlans, switches }: Props) {
  const orphans = useMemo(
    () => vlans.filter((v) => v.assignmentCount === 0),
    [vlans],
  );

  const coverage = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const v of vlans) {
      map.set(v.id, new Set(v.deviceIds));
    }
    return map;
  }, [vlans]);

  if (switches.length === 0) {
    return (
      <section className="surface-card p-6">
        <h2 className="mb-2 text-lg font-semibold text-white">
          Coverage matrix
        </h2>
        <p className="text-sm text-white/50">
          Add switches, routers, or firewalls to your device inventory to see
          VLAN coverage here.
        </p>
        {orphans.length > 0 && <OrphanWarning orphans={orphans} />}
      </section>
    );
  }

  return (
    <section className="surface-card overflow-x-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Coverage matrix</h2>
        <p className="text-xs text-white/40">
          Rows = VLANs · columns = switches
        </p>
      </div>

      <table className="w-full min-w-[400px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-white/40">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-[#1d1830] px-3 py-2 font-medium"
            >
              VLAN
            </th>
            {switches.map((s) => (
              <th
                scope="col"
                key={s.id}
                className="min-w-[90px] px-2 py-2 text-center font-medium"
                title={`${s.name} (${s.manufacturer || "custom"})`}
              >
                <Link
                  href={`/devices/${s.id}`}
                  className="block truncate text-white/70 hover:text-white"
                >
                  {s.name}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {vlans.map((v) => {
            const color =
              COLOR_TAG_MAP[v.colorTag as ColorTag] ?? COLOR_TAG_MAP.purple;
            const set = coverage.get(v.id) ?? new Set<string>();
            return (
              <tr key={v.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-[#1d1830] px-3 py-2 font-normal"
                >
                  <Link
                    href={`/network-tools/vlans/${v.id}`}
                    className="flex items-center gap-2"
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span className="mono text-xs text-white/80">
                      {v.vlanId}
                    </span>
                    <span className="text-white">{v.name}</span>
                  </Link>
                </th>
                {switches.map((s) => {
                  const covered = set.has(s.id);
                  const cellLabel = covered
                    ? `${v.name} assigned to ${s.name}`
                    : `${v.name} not assigned to ${s.name}`;
                  return (
                    <td
                      key={s.id}
                      className={twMerge(
                        "border-l border-white/[0.05] px-2 py-2 text-center",
                      )}
                    >
                      <span
                        role="img"
                        aria-label={cellLabel}
                        title={cellLabel}
                        className={twMerge(
                          "inline-flex h-6 w-6 items-center justify-center rounded text-xs",
                          covered
                            ? "bg-accent-green/20 text-accent-green"
                            : "bg-white/[0.03] text-white/20",
                        )}
                      >
                        {covered ? "●" : "·"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {orphans.length > 0 && <OrphanWarning orphans={orphans} />}
    </section>
  );
}

function OrphanWarning({ orphans }: { orphans: VlanRow[] }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent-orange/30 bg-accent-orange/10 px-4 py-3 text-xs text-accent-orange">
      <Warning
        className="mt-0.5 h-4 w-4 shrink-0"
        weight="duotone"
        aria-hidden
      />
      <div>
        <div className="font-medium">
          <span className="mono">{orphans.length}</span> orphan VLAN
          {orphans.length !== 1 ? "s" : ""}
        </div>
        <div className="mt-1 text-accent-orange/80">
          No devices assigned:{" "}
          {orphans.map((v, i) => (
            <span key={v.id}>
              <Link
                href={`/network-tools/vlans/${v.id}`}
                className="underline hover:text-accent-orange"
              >
                <span className="mono">{v.vlanId}</span> ({v.name})
              </Link>
              {i < orphans.length - 1 && ", "}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
