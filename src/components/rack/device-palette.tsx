"use client";

import { useMemo, useState } from "react";
import { Search, Package, HardDrive } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { DEVICE_TYPE_LABELS } from "@/types";
import type { DeviceType } from "@/types";
import type { DropPayload } from "./types";
import { setDragPayload } from "./drag-state";
import { DeviceGraphic, U_ASPECT } from "./device-graphic";

export type PaletteCatalogItem = {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  deviceType: string;
  sizeU: number;
  portCount: number;
  powerWatts: number | null;
};

export type PaletteUnrackedDevice = {
  id: string;
  name: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  sizeU: number;
  portCount: number;
};

type Props = {
  catalog: PaletteCatalogItem[];
  unracked: PaletteUnrackedDevice[];
};

function matches(search: string, fields: (string | null | undefined)[]) {
  if (!search.trim()) return true;
  const needle = search.toLowerCase().trim();
  return fields.some((f) => f && f.toLowerCase().includes(needle));
}

type DraggablePaletteItemProps = {
  name: string;
  subtitle: string;
  sizeU: number;
  deviceType: string;
  manufacturer: string;
  model: string;
  portCount: number;
  payload: DropPayload;
};

function DraggablePaletteItem({
  name,
  subtitle,
  sizeU,
  deviceType,
  manufacturer,
  model,
  portCount,
  payload,
}: DraggablePaletteItemProps) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        const key =
          payload.kind === "catalog"
            ? "application/x-racksmith-catalog"
            : "application/x-racksmith-existing";
        e.dataTransfer.setData(key, JSON.stringify(payload));
        e.dataTransfer.effectAllowed =
          payload.kind === "catalog" ? "copy" : "move";
        setDragPayload(payload);
        setDragging(true);
      }}
      onDragEnd={() => {
        setDragPayload(null);
        setDragging(false);
      }}
      className={twMerge(
        "group relative cursor-grab overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] p-2 transition-all hover:border-white/25 hover:bg-white/[0.07] active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      {/* Mini device preview (real faceplate at palette scale) */}
      <div
        className="mb-1.5 overflow-hidden rounded"
        style={{ aspectRatio: `${U_ASPECT} / ${sizeU}` }}
      >
        <DeviceGraphic
          deviceType={deviceType}
          manufacturer={manufacturer}
          model={model}
          sizeU={sizeU}
          portCount={portCount}
        />
      </div>

      {/* Label below */}
      <div className="flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-medium text-white">
            {name}
          </div>
          <div className="truncate text-[10px] text-white/50">{subtitle}</div>
        </div>
        <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-white/60">
          {sizeU}U
        </span>
      </div>
    </div>
  );
}

export function DevicePalette({ catalog, unracked }: Props) {
  const [search, setSearch] = useState("");

  const filteredUnracked = useMemo(
    () =>
      unracked.filter((d) =>
        matches(search, [d.name, d.manufacturer, d.model, d.deviceType]),
      ),
    [unracked, search],
  );

  const filteredCatalog = useMemo(
    () =>
      catalog.filter((c) =>
        matches(search, [c.name, c.manufacturer, c.model, c.deviceType]),
      ),
    [catalog, search],
  );

  const catalogByManufacturer = useMemo(() => {
    const groups = new Map<string, PaletteCatalogItem[]>();
    for (const item of filteredCatalog) {
      const key = item.manufacturer || "other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredCatalog]);

  return (
    <aside className="glass-card flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="border-b border-white/10 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-white">Device Palette</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search devices..."
            className="glass-input w-full rounded-lg py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <p className="mt-2 text-[11px] text-white/40">
          Drag devices into rack slots
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredUnracked.length > 0 && (
          <section className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              <HardDrive className="h-3.5 w-3.5 text-accent-green" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Your Devices ({filteredUnracked.length})
              </h4>
            </div>
            <div className="space-y-2">
              {filteredUnracked.map((d) => (
                <DraggablePaletteItem
                  key={d.id}
                  name={d.name}
                  subtitle={
                    d.manufacturer
                      ? `${d.manufacturer} ${d.model || ""}`.trim()
                      : DEVICE_TYPE_LABELS[d.deviceType as DeviceType] ||
                        d.deviceType
                  }
                  sizeU={d.sizeU}
                  deviceType={d.deviceType}
                  manufacturer={d.manufacturer}
                  model={d.model}
                  portCount={d.portCount}
                  payload={{
                    kind: "existing",
                    deviceId: d.id,
                    sizeU: d.sizeU,
                  }}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Device Catalog
          </h4>

          {catalogByManufacturer.length === 0 ? (
            <div className="rounded-lg border border-white/5 p-4 text-center text-xs text-white/40">
              No devices match your search
            </div>
          ) : (
            <div className="space-y-3">
              {catalogByManufacturer.map(([manufacturer, items]) => (
                <div key={manufacturer}>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {manufacturer}
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <DraggablePaletteItem
                        key={item.id}
                        name={item.name}
                        subtitle={`${DEVICE_TYPE_LABELS[item.deviceType as DeviceType] || item.deviceType}${item.portCount > 0 ? ` · ${item.portCount}p` : ""}`}
                        sizeU={item.sizeU}
                        deviceType={item.deviceType}
                        manufacturer={item.manufacturer}
                        model={item.model}
                        portCount={item.portCount}
                        payload={{
                          kind: "catalog",
                          catalogId: item.id,
                          sizeU: item.sizeU,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
