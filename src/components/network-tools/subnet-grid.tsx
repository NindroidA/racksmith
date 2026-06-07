"use client";

import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { bigIntToIp, calculateCidr, ipToBigInt } from "@/lib/ip";
import type { AssignmentLite, DhcpRangeLite } from "./subnet-types";

// Cap the rendered grid at /24 (256 hosts). Larger subnets fall back to the
// assignment list, which is the richer interaction anyway, and keeps each
// cell at a tappable size on touch devices (per WCAG 2.5.5).
const MAX_RENDERED_CELLS = 256;
// Below this cell count, force a 44×44 minimum tap target on every cell.
const COMPACT_GRID_THRESHOLD = 64;

type Props = {
  subnetCidr: string;
  assignments: AssignmentLite[];
  dhcpRanges: DhcpRangeLite[];
  onCellClick: (ip: string) => void;
};

type CellState =
  | { kind: "free" }
  | { kind: "assigned"; assignment: AssignmentLite }
  | { kind: "reserved"; assignment: AssignmentLite }
  | { kind: "dhcp" }
  | { kind: "network" }
  | { kind: "broadcast" }
  | { kind: "conflict"; assignment: AssignmentLite };

type Cell = { ip: string; state: CellState };

export function SubnetGrid({
  subnetCidr,
  assignments,
  dhcpRanges,
  onCellClick,
}: Props) {
  const details = useMemo(() => calculateCidr(subnetCidr), [subnetCidr]);

  const notRenderable =
    details.kind === "ipv6" || Number(details.totalHosts) > MAX_RENDERED_CELLS;

  const cells = useMemo(
    () =>
      notRenderable
        ? []
        : buildCells(
            details.network,
            Number(details.totalHosts),
            assignments,
            dhcpRanges,
          ),
    [
      notRenderable,
      details.network,
      details.totalHosts,
      assignments,
      dhcpRanges,
    ],
  );

  if (notRenderable) {
    return (
      <section className="surface-card p-6">
        <h2 className="mb-2 text-lg font-semibold text-white">Grid</h2>
        <p className="text-sm text-white/60">
          Subnet too large to render every address (
          <span className="mono">{details.totalHosts.toString()}</span> total).
          See the assignment list below.
        </p>
      </section>
    );
  }

  const cols = Math.min(16, cells.length);

  return (
    <section className="surface-card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Grid · <span className="mono">{cells.length}</span> addresses
        </h2>
        <Legend />
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Subnet address grid"
      >
        {cells.map((cell) => (
          <CellButton
            key={cell.ip}
            cell={cell}
            onClick={() => onCellClick(cell.ip)}
            compact={cells.length <= COMPACT_GRID_THRESHOLD}
          />
        ))}
      </div>
    </section>
  );
}

function buildCells(
  network: string,
  total: number,
  assignments: AssignmentLite[],
  dhcpRanges: DhcpRangeLite[],
): Cell[] {
  const base = ipToBigInt(network);
  const byIp = new Map(assignments.map((a) => [a.ipAddress, a]));
  const dhcpBounds = dhcpRanges.map((r) => ({
    start: ipToBigInt(r.startIp),
    end: ipToBigInt(r.endIp),
  }));

  const cells: Cell[] = [];
  let cursor = base;
  for (let i = 0; i < total; i++, cursor++) {
    const ip = bigIntToIp(cursor, "ipv4");
    const assignment = byIp.get(ip);
    const inDhcp = dhcpBounds.some((b) => cursor >= b.start && cursor <= b.end);

    let state: CellState;
    if (i === 0) state = { kind: "network" };
    else if (i === total - 1) state = { kind: "broadcast" };
    else if (assignment && assignment.status === "dhcp")
      state = { kind: "dhcp" };
    else if (
      assignment &&
      inDhcp &&
      (assignment.status === "assigned" || assignment.status === "reserved")
    )
      state = { kind: "conflict", assignment };
    else if (assignment && assignment.status === "reserved")
      state = { kind: "reserved", assignment };
    else if (assignment) state = { kind: "assigned", assignment };
    else if (inDhcp) state = { kind: "dhcp" };
    else state = { kind: "free" };

    cells.push({ ip, state });
  }
  return cells;
}

function CellButton({
  cell,
  onClick,
  compact,
}: {
  cell: Cell;
  onClick: () => void;
  compact: boolean;
}) {
  const label = describeCell(cell);
  const { className, canClick } = styleForCell(cell.state);
  return (
    <button
      type="button"
      disabled={!canClick}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={twMerge(
        "relative flex aspect-square items-center justify-center rounded text-[9px] font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50",
        compact && "min-h-[44px] min-w-[44px]",
        className,
      )}
    >
      <span className="pointer-events-none opacity-60">
        {cell.ip.split(".").pop()}
      </span>
    </button>
  );
}

function describeCell(cell: Cell): string {
  switch (cell.state.kind) {
    case "network":
      return `${cell.ip} · network address`;
    case "broadcast":
      return `${cell.ip} · broadcast`;
    case "dhcp":
      return `${cell.ip} · DHCP pool`;
    case "reserved":
      return `${cell.ip} · reserved${cell.state.assignment.device ? ` (${cell.state.assignment.device.name})` : ""}`;
    case "assigned":
      return `${cell.ip} · ${cell.state.assignment.device ? cell.state.assignment.device.name : "assigned"}`;
    case "conflict":
      return `${cell.ip} · conflict — static inside DHCP range`;
    case "free":
      return `${cell.ip} · free — click to assign`;
  }
}

function styleForCell(state: CellState): {
  className: string;
  canClick: boolean;
} {
  switch (state.kind) {
    case "network":
    case "broadcast":
      return {
        className: "bg-white/[0.02] text-white/30 cursor-not-allowed",
        canClick: false,
      };
    case "dhcp":
      return {
        className: "bg-accent-blue/25 text-white hover:bg-accent-blue/35",
        canClick: true,
      };
    case "reserved":
      return {
        className: "bg-accent-orange/25 text-white hover:bg-accent-orange/35",
        canClick: true,
      };
    case "assigned":
      return {
        className: "bg-accent-green/25 text-white hover:bg-accent-green/35",
        canClick: true,
      };
    case "conflict":
      return {
        className:
          "bg-accent-red/35 text-white ring-1 ring-accent-red hover:bg-accent-red/45",
        canClick: true,
      };
    case "free":
      return {
        className: "bg-white/[0.04] text-white/40 hover:bg-white/[0.1]",
        canClick: true,
      };
  }
}

function Legend() {
  const items: Array<{ className: string; label: string }> = [
    { className: "bg-white/[0.04]", label: "Free" },
    { className: "bg-accent-green/25", label: "Assigned" },
    { className: "bg-accent-orange/25", label: "Reserved" },
    { className: "bg-accent-blue/25", label: "DHCP" },
    { className: "bg-accent-red/35 ring-1 ring-accent-red", label: "Conflict" },
  ];
  return (
    <ul
      aria-label="Grid legend"
      className="flex flex-wrap items-center gap-3 text-xs text-white/50"
    >
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded ${it.className}`} aria-hidden />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
