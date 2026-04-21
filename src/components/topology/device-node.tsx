"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import Link from "next/link";
import { DeviceGraphic, U_ASPECT } from "@/components/rack/device-graphic";
import { DEVICE_TYPE_LABELS, type DeviceType } from "@/types";

export type DeviceNodeData = {
  deviceId: string;
  name: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  sizeU: number;
  portCount: number;
  ipAddress: string | null;
  rackName: string | null;
};

function DeviceNodeInner({ data, selected }: NodeProps) {
  const d = data as unknown as DeviceNodeData;
  const typeLabel =
    DEVICE_TYPE_LABELS[d.deviceType as DeviceType] || d.deviceType;

  // Width based on device size — bigger devices take more canvas room
  const width = 260;
  const height = width / (U_ASPECT / d.sizeU);

  return (
    <div
      className={
        "group flex flex-col rounded-xl transition-all " +
        (selected
          ? "ring-2 ring-primary shadow-[0_0_24px_rgba(59,130,246,0.3)]"
          : "ring-1 ring-white/10 hover:ring-white/25")
      }
      style={{ width, background: "rgba(20, 25, 40, 0.85)" }}
    >
      {/* Connection handles on all four sides */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!h-2 !w-2 !border-0 !bg-primary/70"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-2 !w-2 !border-0 !bg-primary/70"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!h-2 !w-2 !border-0 !bg-primary/70"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!h-2 !w-2 !border-0 !bg-primary/70"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-in"
        className="!h-2 !w-2 !border-0 !bg-primary/30"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-in"
        className="!h-2 !w-2 !border-0 !bg-primary/30"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-in"
        className="!h-2 !w-2 !border-0 !bg-primary/30"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-in"
        className="!h-2 !w-2 !border-0 !bg-primary/30"
      />

      {/* Device faceplate */}
      <div
        className="overflow-hidden rounded-t-xl bg-black/30 p-1"
        style={{ height }}
      >
        <DeviceGraphic
          deviceType={d.deviceType}
          manufacturer={d.manufacturer || "custom"}
          model={d.model}
          sizeU={d.sizeU}
          portCount={d.portCount}
        />
      </div>

      {/* Label */}
      <div className="border-t border-white/10 px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/devices/${d.deviceId}`}
            className="truncate text-xs font-semibold text-white hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {d.name}
          </Link>
          <span className="shrink-0 rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[9px] text-white/50">
            {d.sizeU}U
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/50">
          <span>{typeLabel}</span>
          {d.ipAddress && (
            <>
              <span>·</span>
              <span className="truncate font-mono">{d.ipAddress}</span>
            </>
          )}
          {d.rackName && (
            <>
              <span>·</span>
              <span className="truncate">{d.rackName}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const DeviceNode = memo(DeviceNodeInner);
