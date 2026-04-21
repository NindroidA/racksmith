import { calculateCidr } from "@/lib/ip/calculate";
import { ipToBigInt } from "@/lib/ip/parse";
import type { Snapshot } from "./snapshot";
import type { Recommendation, Severity } from "./types";

// ─── Threshold constants (locked, see research §1.5) ─────

const RACK_FILL_WARN = 0.8;
const RACK_FILL_CRIT = 0.95;
const PORT_FILL_WARN = 0.9;
const PORT_FILL_CRIT = 0.95;
const SUBNET_FILL_WARN = 0.85;
const SUBNET_FILL_CRIT = 0.95;
const DHCP_FILL_WARN = 0.85;
const DHCP_FILL_CRIT = 0.95;
const POE_FILL_WARN = 0.8;
const POE_FILL_CRIT = 0.9;

// PD power defaults when a device has no powerWatts. See research §1.1.
const PD_DEFAULTS_W: Record<string, number> = {
  switch: 25,
  router: 25,
  firewall: 30,
  server: 80,
  storage: 60,
  ups: 0, // UPS draws upstream, not from the switch
  pdu: 0,
  patch_panel: 0,
  other: 10,
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function severityForFill(
  fill: number,
  warn: number,
  crit: number,
): Severity | null {
  if (fill >= crit) return "critical";
  if (fill >= warn) return "warning";
  return null;
}

// ─── Rule context: precomputed lookups shared across rules ────
// Built once in evaluate.ts and threaded through every rule. Avoids
// re-walking the connections array per rule.

export type RuleContext = {
  /** deviceId → number of times the device appears as either end of a connection. */
  portUseByDevice: Map<string, number>;
  /** deviceId → set of peer deviceIds it's connected to. */
  neighbours: Map<string, Set<string>>;
  /** deviceId → device record, for O(1) lookups inside rules. */
  deviceById: Map<string, Snapshot["devices"][number]>;
};

export function buildRuleContext(snapshot: Snapshot): RuleContext {
  const portUseByDevice = new Map<string, number>();
  const neighbours = new Map<string, Set<string>>();
  for (const c of snapshot.connections) {
    portUseByDevice.set(
      c.sourceDeviceId,
      (portUseByDevice.get(c.sourceDeviceId) ?? 0) + 1,
    );
    portUseByDevice.set(
      c.targetDeviceId,
      (portUseByDevice.get(c.targetDeviceId) ?? 0) + 1,
    );
    if (!neighbours.has(c.sourceDeviceId))
      neighbours.set(c.sourceDeviceId, new Set());
    if (!neighbours.has(c.targetDeviceId))
      neighbours.set(c.targetDeviceId, new Set());
    neighbours.get(c.sourceDeviceId)!.add(c.targetDeviceId);
    neighbours.get(c.targetDeviceId)!.add(c.sourceDeviceId);
  }
  const deviceById = new Map(snapshot.devices.map((d) => [d.id, d]));
  return { portUseByDevice, neighbours, deviceById };
}

export type RuleFn = (snapshot: Snapshot, ctx: RuleContext) => Recommendation[];

// ─── Rule: rack U-fill ───────────────────────────────────

const ruleRackFill: RuleFn = (snapshot) => {
  const out: Recommendation[] = [];
  for (const rack of snapshot.racks) {
    if (rack.sizeU === 0) continue;
    const fill = rack.deviceFillU / rack.sizeU;
    const sev = severityForFill(fill, RACK_FILL_WARN, RACK_FILL_CRIT);
    if (!sev) continue;
    out.push({
      ruleKey: "rack:fill",
      entityKey: `rack:${rack.id}`,
      severity: sev,
      title: `Rack "${rack.name}" is ${pct(fill)} full`,
      detail:
        sev === "critical"
          ? `Only ${rack.sizeU - rack.deviceFillU}U of ${rack.sizeU}U remains. Plan expansion now — there's no slack for an emergency swap.`
          : `${rack.deviceFillU} of ${rack.sizeU}U used. Start budgeting for additional rack capacity within the quarter.`,
      resource: { type: "rack", id: rack.id, label: rack.name },
    });
  }
  return out;
};

// ─── Rule: switch port fill ──────────────────────────────

const ruleSwitchPortFill: RuleFn = (snapshot, ctx) => {
  const out: Recommendation[] = [];
  for (const dev of snapshot.devices) {
    if (dev.deviceType !== "switch" || dev.portCount <= 0) continue;
    const used = ctx.portUseByDevice.get(dev.id) ?? 0;
    const fill = used / dev.portCount;
    const sev = severityForFill(fill, PORT_FILL_WARN, PORT_FILL_CRIT);
    if (!sev) continue;
    out.push({
      ruleKey: "switch:port_fill",
      entityKey: `device:${dev.id}`,
      severity: sev,
      title: `Switch "${dev.name}" using ${used} of ${dev.portCount} ports (${pct(fill)})`,
      detail:
        sev === "critical"
          ? `Only ${dev.portCount - used} ports free. New endpoints will not fit without a port-density upgrade.`
          : `Approaching capacity. Add an access switch or migrate seldom-used endpoints before hitting the wall.`,
      resource: { type: "device", id: dev.id, label: dev.name },
    });
  }
  return out;
};

// ─── Rule: PoE budget per switch ─────────────────────────

const ruleSwitchPoeBudget: RuleFn = (snapshot, ctx) => {
  const out: Recommendation[] = [];
  const switches = snapshot.devices.filter(
    (d) => d.deviceType === "switch" && (d.powerWatts ?? 0) > 0,
  );
  for (const sw of switches) {
    const budget = sw.powerWatts ?? 0;
    if (budget <= 0) continue;
    let draw = 0;
    for (const peerId of ctx.neighbours.get(sw.id) ?? []) {
      const peer = ctx.deviceById.get(peerId);
      if (!peer) continue;
      draw += peer.powerWatts ?? PD_DEFAULTS_W[peer.deviceType] ?? 0;
    }
    if (draw <= 0) continue;
    const fill = draw / budget;
    const sev = severityForFill(fill, POE_FILL_WARN, POE_FILL_CRIT);
    if (!sev) continue;
    out.push({
      ruleKey: "switch:poe_budget",
      entityKey: `device:${sw.id}`,
      severity: sev,
      title: `${sw.name} PoE draw ≈ ${draw}W of ${budget}W (${pct(fill)})`,
      detail:
        sev === "critical"
          ? `Estimated PD draw is at or beyond the safe budget. Move PoE devices to a second switch or upgrade the PSU.`
          : `Within 20% of the PoE budget. Plan additional capacity before adding more powered devices.`,
      resource: { type: "device", id: sw.id, label: sw.name },
    });
  }
  return out;
};

// ─── Rule: subnet IP fill ────────────────────────────────

function usableHostsForCidr(cidr: string): number {
  try {
    const parsed = calculateCidr(cidr);
    if (parsed.usableHosts > BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number.MAX_SAFE_INTEGER;
    }
    return Number(parsed.usableHosts);
  } catch {
    return 0;
  }
}

const ruleSubnetFill: RuleFn = (snapshot) => {
  const out: Recommendation[] = [];
  for (const subnet of snapshot.subnets) {
    const usable = usableHostsForCidr(subnet.cidr);
    if (usable === 0) continue;
    const fill = subnet.assignmentCount / usable;
    const sev = severityForFill(fill, SUBNET_FILL_WARN, SUBNET_FILL_CRIT);
    if (!sev) continue;
    out.push({
      ruleKey: "subnet:fill",
      entityKey: `subnet:${subnet.id}`,
      severity: sev,
      title: `Subnet "${subnet.name}" (${subnet.cidr}) is ${pct(fill)} assigned`,
      detail:
        sev === "critical"
          ? `${subnet.assignmentCount} of ~${usable} usable addresses in use. Resize or split before assignments fail.`
          : `Approaching exhaustion. Evaluate growth or reserve a wider parent CIDR.`,
      resource: { type: "subnet", id: subnet.id, label: subnet.name },
    });
  }
  return out;
};

// ─── Rule: DHCP pool exhaustion ──────────────────────────

function rangeSize(startIp: string, endIp: string): number {
  try {
    const start = ipToBigInt(startIp);
    const end = ipToBigInt(endIp);
    if (end < start) return 0;
    const span = end - start + 1n;
    return span > BigInt(Number.MAX_SAFE_INTEGER)
      ? Number.MAX_SAFE_INTEGER
      : Number(span);
  } catch {
    return 0;
  }
}

const ruleDhcpExhaustion: RuleFn = (snapshot) => {
  const out: Recommendation[] = [];
  for (const subnet of snapshot.subnets) {
    if (subnet.dhcpRanges.length === 0) continue;
    const totalPool = subnet.dhcpRanges.reduce(
      (sum, r) => sum + rangeSize(r.startIp, r.endIp),
      0,
    );
    if (totalPool === 0) continue;
    const fill = subnet.dhcpAssignmentCount / totalPool;
    const sev = severityForFill(fill, DHCP_FILL_WARN, DHCP_FILL_CRIT);
    if (!sev) continue;
    out.push({
      ruleKey: "subnet:dhcp_pool",
      entityKey: `subnet:${subnet.id}`,
      severity: sev,
      title: `DHCP pool on "${subnet.name}" is ${pct(fill)} exhausted`,
      detail:
        sev === "critical"
          ? `${subnet.dhcpAssignmentCount} active DHCP leases in a ${totalPool}-address pool. New clients will be denied — widen the pool or shorten the lease.`
          : `Pool is filling fast. Plan a wider range or shorter lease time.`,
      resource: { type: "subnet", id: subnet.id, label: subnet.name },
    });
  }
  return out;
};

// ─── Rule: orphan VLANs ──────────────────────────────────

const ruleOrphanVlans: RuleFn = (snapshot) =>
  snapshot.vlans
    .filter((v) => v.assignmentCount === 0)
    .map((v) => ({
      ruleKey: "vlan:orphan",
      entityKey: `vlan:${v.id}`,
      severity: "info" as Severity,
      title: `VLAN ${v.vlanId} (${v.name}) has no device assignments`,
      detail:
        "Defined but never assigned to a switch. Either remove it or assign it to the relevant trunk/access ports.",
      resource: { type: "vlan", id: v.id, label: v.name },
    }));

// ─── Rule: unracked rackable devices ─────────────────────

const ruleUnrackedRackables: RuleFn = (snapshot) => {
  const unracked = snapshot.devices.filter(
    (d) => d.sizeU > 0 && d.rackId === null,
  );
  if (unracked.length === 0) return [];
  return [
    {
      ruleKey: "device:unracked",
      entityKey: `org:${snapshot.organizationId}`,
      severity: "info",
      title: `${unracked.length} rackable device${unracked.length === 1 ? "" : "s"} not yet placed`,
      detail:
        "Devices with a U size but no rack assignment. Drop them into a rack to keep the visualizer accurate.",
    },
  ];
};

// ─── Public API ──────────────────────────────────────────

export const ALL_RULES: ReadonlyArray<RuleFn> = [
  ruleRackFill,
  ruleSwitchPortFill,
  ruleSwitchPoeBudget,
  ruleSubnetFill,
  ruleDhcpExhaustion,
  ruleOrphanVlans,
  ruleUnrackedRackables,
];
