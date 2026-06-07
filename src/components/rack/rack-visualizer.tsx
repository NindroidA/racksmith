"use client";

import { useEffect, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { TrashSimple } from "@phosphor-icons/react/dist/ssr";
import { DEVICE_TYPE_LABELS } from "@/types";
import type { DeviceType } from "@/types";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDragPayload, setDragPayload } from "./drag-state";
import { DeviceGraphic, U_ASPECT } from "./device-graphic";
import type { DropPayload, VisualizerDevice } from "./types";

type ConfirmTarget =
  | { kind: "unrack"; deviceId: string; deviceName: string }
  | { kind: "delete"; deviceId: string; deviceName: string }
  | null;

type Props = {
  rackSizeU: number;
  devices: VisualizerDevice[];
  onDrop: (positionU: number, payload: DropPayload) => void;
  onRemove: (deviceId: string) => void;
  onDelete: (deviceId: string) => void;
};

type DragHover = { bottomU: number; sizeU: number } | null;

function parsePayload(e: React.DragEvent): DropPayload | null {
  const catalog = e.dataTransfer.getData("application/x-racksmith-catalog");
  if (catalog) {
    try {
      return JSON.parse(catalog) as DropPayload;
    } catch {
      return null;
    }
  }
  const existing = e.dataTransfer.getData("application/x-racksmith-existing");
  if (existing) {
    try {
      return JSON.parse(existing) as DropPayload;
    } catch {
      return null;
    }
  }
  return null;
}

/** Real rack slot aspect — each U is 10.86:1 width-to-height */
function slotStyle(sizeU: number): React.CSSProperties {
  return { aspectRatio: `${U_ASPECT} / ${sizeU}` };
}

export function RackVisualizer({
  rackSizeU,
  devices,
  onDrop,
  onRemove,
  onDelete,
}: Props) {
  const [hoverDrag, setHoverDrag] = useState<DragHover>(null);
  const activeDrag = useDragPayload();
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);

  function performConfirm() {
    if (!confirmTarget) return;
    if (confirmTarget.kind === "unrack") {
      onRemove(confirmTarget.deviceId);
    } else {
      onDelete(confirmTarget.deviceId);
    }
    setConfirmTarget(null);
  }

  useEffect(() => {
    if (!activeDrag) setHoverDrag(null);
  }, [activeDrag]);

  const occupied = useMemo(() => {
    const set = new Set<number>();
    for (const d of devices) {
      for (let u = d.positionU; u < d.positionU + d.sizeU; u++) set.add(u);
    }
    return set;
  }, [devices]);

  function handleDragOver(e: React.DragEvent, bottomU: number) {
    if (!activeDrag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect =
      activeDrag.kind === "existing" ? "move" : "copy";
    setHoverDrag({ bottomU, sizeU: activeDrag.sizeU });
  }

  function handleDrop(e: React.DragEvent, bottomU: number) {
    e.preventDefault();
    const payload = parsePayload(e) ?? activeDrag;
    setHoverDrag(null);
    setDragPayload(null);
    if (!payload) return;
    onDrop(bottomU, payload);
  }

  function isHoverPreview(slotU: number) {
    if (!hoverDrag) return false;
    return (
      slotU >= hoverDrag.bottomU && slotU < hoverDrag.bottomU + hoverDrag.sizeU
    );
  }

  const hoverHasAnyCollision = useMemo(() => {
    if (!hoverDrag) return false;
    if (hoverDrag.bottomU + hoverDrag.sizeU - 1 > rackSizeU) return true;
    for (
      let u = hoverDrag.bottomU;
      u < hoverDrag.bottomU + hoverDrag.sizeU;
      u++
    ) {
      if (occupied.has(u)) return true;
    }
    return false;
  }, [hoverDrag, rackSizeU, occupied]);

  const slots: Array<{
    u: number;
    device: VisualizerDevice | null;
    isDeviceTop: boolean;
  }> = [];

  for (let u = rackSizeU; u >= 1; u--) {
    const device =
      devices.find((d) => u >= d.positionU && u < d.positionU + d.sizeU) ??
      null;
    const isDeviceTop = device
      ? u === device.positionU + device.sizeU - 1
      : false;
    slots.push({ u, device, isDeviceTop });
  }

  const usedU = devices.reduce((sum, d) => sum + d.sizeU, 0);

  return (
    <div className="surface-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Rack Layout</h2>
          <p className="text-sm text-white/50">
            <span className="mono">{rackSizeU}</span>U total ·{" "}
            <span className="mono">{usedU}</span>U used ·{" "}
            <span className="mono">{rackSizeU - usedU}</span>U free
          </p>
        </div>
        <div className="text-sm text-white/60">
          <span className="mono">{devices.length}</span> device
          {devices.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="mx-auto max-w-[640px] rounded-xl border-2 border-white/10 bg-black/50 p-3 shadow-inner">
        <div className="space-y-[2px]">
          {slots.map(({ u, device, isDeviceTop }) => {
            if (device && !isDeviceTop) return null;

            if (device && isDeviceTop) {
              const topU = device.positionU + device.sizeU - 1;
              const label =
                DEVICE_TYPE_LABELS[device.deviceType as DeviceType] ||
                device.deviceType;

              return (
                <div
                  key={`dev-${device.id}`}
                  draggable
                  onDragStart={(e) => {
                    const payload: DropPayload = {
                      kind: "existing",
                      deviceId: device.id,
                      sizeU: device.sizeU,
                    };
                    e.dataTransfer.setData(
                      "application/x-racksmith-existing",
                      JSON.stringify(payload),
                    );
                    e.dataTransfer.effectAllowed = "move";
                    setDragPayload(payload);
                  }}
                  onDragEnd={() => {
                    setDragPayload(null);
                    setHoverDrag(null);
                  }}
                  style={slotStyle(device.sizeU)}
                  className="group relative overflow-hidden rounded-md cursor-grab active:cursor-grabbing transition-all hover:ring-2 hover:ring-white/20 hover:ring-offset-0"
                  title={`${device.name} — ${device.positionU === topU ? `U${device.positionU}` : `U${device.positionU}-${topU}`}`}
                >
                  {/* Authentic device faceplate */}
                  <DeviceGraphic
                    deviceType={device.deviceType}
                    manufacturer={device.manufacturer}
                    model={device.model}
                    sizeU={device.sizeU}
                    portCount={device.portCount}
                  />

                  {/* Position label (appears on left outside chassis) */}
                  <div className="mono pointer-events-none absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[8px] text-white/50 backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100">
                    {device.positionU === topU
                      ? `U${device.positionU}`
                      : `U${device.positionU}-${topU}`}
                  </div>

                  {/* Hover overlay with name + actions */}
                  <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="pointer-events-auto flex w-full items-end justify-between gap-2 px-2 pb-1">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-semibold text-white drop-shadow">
                          {device.name}
                        </div>
                        <div className="truncate text-[9px] text-white/60 drop-shadow">
                          {label} · <span className="mono">{device.sizeU}</span>
                          U
                          {device.portCount > 0 && (
                            <>
                              {" · "}
                              <span className="mono">
                                {device.portCount}
                              </span>{" "}
                              ports
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmTarget({
                              kind: "unrack",
                              deviceId: device.id,
                              deviceName: device.name,
                            });
                          }}
                          className="min-h-[44px] bg-white/15 text-[10px] text-white backdrop-blur hover:bg-white/30 hover:text-white"
                          title="Remove from rack"
                        >
                          Unrack
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmTarget({
                              kind: "delete",
                              deviceId: device.id,
                              deviceName: device.name,
                            });
                          }}
                          className="min-h-[44px] min-w-[44px] backdrop-blur"
                          title="Delete device"
                          aria-label="Delete device"
                        >
                          <TrashSimple className="h-3.5 w-3.5" weight="bold" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Empty slot
            const preview = isHoverPreview(u);
            const collision = preview && hoverHasAnyCollision;

            return (
              <div
                key={u}
                onDragOver={(e) => handleDragOver(e, u)}
                onDrop={(e) => handleDrop(e, u)}
                style={slotStyle(1)}
                className={twMerge(
                  "mono flex items-center justify-between rounded-md border border-dashed border-white/8 px-3 text-[10px] text-white/25 transition-all",
                  preview &&
                    !collision &&
                    "border-primary/60 border-solid bg-primary/15 text-white/80",
                  preview &&
                    collision &&
                    "border-accent-red/60 border-solid bg-accent-red/20 text-accent-red",
                )}
              >
                <span>U{u}</span>
                <span className="text-white/25">
                  {preview && collision
                    ? "Blocked"
                    : preview
                      ? "Drop here"
                      : ""}
                </span>
              </div>
            );
          })}
        </div>

        {hoverHasAnyCollision && hoverDrag && (
          <div className="mt-3 rounded-lg border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
            Cannot place here — overlaps existing device or extends past rack
            top
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        title={
          confirmTarget?.kind === "unrack"
            ? "Remove from rack?"
            : "Delete device?"
        }
        body={
          confirmTarget?.kind === "unrack" ? (
            <p>
              Remove{" "}
              <span className="font-medium text-white">
                {confirmTarget.deviceName}
              </span>{" "}
              from the rack? The device stays in your inventory and can be
              placed in another rack later.
            </p>
          ) : (
            <p>
              Permanently delete{" "}
              <span className="font-medium text-white">
                {confirmTarget?.deviceName}
              </span>
              ? This removes the device from your inventory entirely and cannot
              be undone.
            </p>
          )
        }
        confirmLabel={
          confirmTarget?.kind === "unrack"
            ? "Remove from rack"
            : "Delete device"
        }
        onConfirm={performConfirm}
      />
    </div>
  );
}
