"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";
import { MagnifyingGlass, HardDrives } from "@phosphor-icons/react/dist/ssr";
import { DEVICE_TYPE_LABELS, type DeviceType } from "@/types";
import { DeviceGraphic, U_ASPECT } from "@/components/rack/device-graphic";
import { Select, SelectOption } from "@/components/ui/select";

export type DeviceRow = {
  id: string;
  name: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  sizeU: number;
  portCount: number;
  ipAddress: string | null;
  rackId: string | null;
  rackName: string | null;
  positionU: number | null;
  updatedAt: Date;
};

type SortKey = "name" | "type" | "manufacturer" | "rack" | "updated";
type RackedFilter = "all" | "racked" | "unracked";

type Props = {
  devices: DeviceRow[];
};

const TYPES = [
  "router",
  "switch",
  "server",
  "firewall",
  "storage",
  "ups",
  "pdu",
  "patch_panel",
  "other",
] as const;

export function DeviceListClient({ devices }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [mfrFilter, setMfrFilter] = useState<string | null>(null);
  const [rackedFilter, setRackedFilter] = useState<RackedFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDesc, setSortDesc] = useState(true);

  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    for (const d of devices) {
      if (d.manufacturer) set.add(d.manufacturer.toLowerCase());
    }
    return Array.from(set).sort();
  }, [devices]);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return devices.filter((d) => {
      if (typeFilter && d.deviceType !== typeFilter) return false;
      if (mfrFilter && d.manufacturer.toLowerCase() !== mfrFilter) return false;
      if (rackedFilter === "racked" && !d.rackId) return false;
      if (rackedFilter === "unracked" && d.rackId) return false;
      if (needle) {
        const haystack = [
          d.name,
          d.manufacturer,
          d.model,
          d.ipAddress ?? "",
          d.rackName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [devices, search, typeFilter, mfrFilter, rackedFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: string | number | Date = "";
      let bv: string | number | Date = "";
      switch (sortKey) {
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "type":
          av = a.deviceType;
          bv = b.deviceType;
          break;
        case "manufacturer":
          av = a.manufacturer.toLowerCase();
          bv = b.manufacturer.toLowerCase();
          break;
        case "rack":
          av = (a.rackName ?? "zzz").toLowerCase();
          bv = (b.rackName ?? "zzz").toLowerCase();
          break;
        case "updated":
          av = a.updatedAt.getTime();
          bv = b.updatedAt.getTime();
          break;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDesc ? -cmp : cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(key === "updated");
    }
  }

  const totalCount = devices.length;
  const shownCount = sorted.length;
  const activeFilterCount =
    (typeFilter ? 1 : 0) +
    (mfrFilter ? 1 : 0) +
    (rackedFilter !== "all" ? 1 : 0);

  return (
    <div>
      {/* Search + filter toolbar */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
            weight="bold"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${totalCount} devices by name, model, IP, rack...`}
            className="glass-input w-full rounded-lg py-2.5 pl-10 pr-3 text-sm"
            autoComplete="off"
            data-1p-ignore
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Racked state filter */}
          <div
            role="group"
            aria-label="Filter by rack status"
            className="flex items-center gap-1 rounded-lg bg-white/[0.04] p-0.5"
          >
            {(["all", "racked", "unracked"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRackedFilter(v)}
                aria-pressed={rackedFilter === v}
                className={twMerge(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50",
                  rackedFilter === v
                    ? "bg-white/[0.1] text-white"
                    : "text-white/50 hover:text-white/80",
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Type filter dropdown */}
          <Select
            value={typeFilter ?? ""}
            onValueChange={(v) => setTypeFilter(v || null)}
            placeholder="All types"
            className="px-3 py-1.5 text-xs font-medium"
            aria-label="Filter by device type"
          >
            <SelectOption value="">All types</SelectOption>
            {TYPES.map((t) => (
              <SelectOption key={t} value={t}>
                {DEVICE_TYPE_LABELS[t]}
              </SelectOption>
            ))}
          </Select>

          {manufacturers.length > 0 && (
            <Select
              value={mfrFilter ?? ""}
              onValueChange={(v) => setMfrFilter(v || null)}
              placeholder="All manufacturers"
              className="px-3 py-1.5 text-xs font-medium"
              aria-label="Filter by manufacturer"
            >
              <SelectOption value="">All manufacturers</SelectOption>
              {manufacturers.map((m) => (
                <SelectOption key={m} value={m}>
                  {m}
                </SelectOption>
              ))}
            </Select>
          )}

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setTypeFilter(null);
                setMfrFilter(null);
                setRackedFilter("all");
              }}
              className="text-xs text-white/50 hover:text-white/90"
            >
              Clear filters ({activeFilterCount})
            </button>
          )}

          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="ml-auto text-xs text-white/40"
          >
            {shownCount === totalCount
              ? `${totalCount} total`
              : `${shownCount} of ${totalCount}`}
          </span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="surface-card flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-xl bg-accent-purple/20 p-4">
            <HardDrives
              className="h-8 w-8 text-accent-purple"
              weight="duotone"
            />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-white">No matches</h2>
          <p className="mb-4 max-w-sm text-sm text-white/50">
            Try clearing filters or a different search.
          </p>
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
                <th scope="col" className="w-28 px-4 py-3 font-medium">
                  Preview
                </th>
                <SortableHeader
                  label="Name"
                  active={sortKey === "name"}
                  desc={sortDesc}
                  onClick={() => toggleSort("name")}
                />
                <SortableHeader
                  label="Type"
                  active={sortKey === "type"}
                  desc={sortDesc}
                  onClick={() => toggleSort("type")}
                />
                <SortableHeader
                  label="Manufacturer"
                  active={sortKey === "manufacturer"}
                  desc={sortDesc}
                  onClick={() => toggleSort("manufacturer")}
                />
                <SortableHeader
                  label="Rack"
                  active={sortKey === "rack"}
                  desc={sortDesc}
                  onClick={() => toggleSort("rack")}
                />
                <th scope="col" className="px-4 py-3 font-medium">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {sorted.map((d) => (
                <tr
                  key={d.id}
                  className="group transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/devices/${d.id}`}
                      className="block overflow-hidden rounded bg-black/30"
                      style={{ aspectRatio: `${U_ASPECT} / ${d.sizeU}` }}
                    >
                      <DeviceGraphic
                        deviceType={d.deviceType}
                        manufacturer={d.manufacturer || "custom"}
                        model={d.model}
                        sizeU={d.sizeU}
                        portCount={d.portCount}
                      />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/devices/${d.id}`}
                      className="font-medium text-white transition-colors hover:text-primary"
                    >
                      {d.name}
                    </Link>
                    {d.model && (
                      <div className="text-xs text-white/40">{d.model}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {DEVICE_TYPE_LABELS[d.deviceType as DeviceType] ||
                      d.deviceType}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {d.manufacturer || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {d.rackId && d.rackName ? (
                      <Link
                        href={`/racks/${d.rackId}`}
                        className="text-white/80 hover:text-primary"
                      >
                        {d.rackName}
                        {d.positionU != null && (
                          <span className="mono ml-1 text-xs text-white/40">
                            U{d.positionU}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <span className="text-white/30">Unracked</span>
                    )}
                  </td>
                  <td className="mono px-4 py-3 text-xs text-white/60">
                    {d.ipAddress || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  active,
  desc,
  onClick,
}: {
  label: string;
  active: boolean;
  desc: boolean;
  onClick: () => void;
}) {
  return (
    <th
      scope="col"
      aria-sort={active ? (desc ? "descending" : "ascending") : "none"}
      className="px-4 py-3 font-medium"
    >
      <button
        type="button"
        onClick={onClick}
        className={twMerge(
          "flex items-center gap-1 rounded uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50",
          active ? "text-white" : "hover:text-white/80",
        )}
      >
        {label}
        {active && (
          <span className="text-[9px]" aria-hidden>
            {desc ? "▼" : "▲"}
          </span>
        )}
      </button>
    </th>
  );
}
