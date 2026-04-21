import "server-only";

import type { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { calculateCidr } from "@/lib/ip/calculate";
import { TIER_LIMITS, getOrganizationPlan } from "@/lib/tiers";
import { acquireTenantResourceLock } from "@/lib/prisma-tenant";
import { invalidateRecommendations } from "@/lib/recommendations/cache";
import type { ActionResult } from "@/lib/action-types";
import type { WizardInputs } from "./wizard-types";

export type MaterializedIds = {
  rackId: string;
  deviceIds: string[];
  vlanIds: string[];
  subnetIds: string[];
};

/**
 * Pre-flight tier checks inside a transaction with advisory locks held on
 * every resource category the plan will create. Run this AT THE TOP of the
 * `applyBuildPlan` transaction so the counts are point-in-time consistent
 * with the subsequent inserts — closes the TOCTOU window where a concurrent
 * action could push the org over a tier limit between preflight and
 * materialize.
 *
 * (The earlier `preflightTierChecks` non-locked variant was removed in the
 * post-10g rescan — Phase 10g shipped advisory locks and no caller needs
 * the racy lookahead anymore.)
 */
export async function preflightTierChecksLocked(
  tx: Prisma.TransactionClient,
  organizationId: string,
  inputs: WizardInputs,
): Promise<ActionResult> {
  if (!inputs.profile || !inputs.topology || !inputs.network) {
    return {
      ok: false,
      error: "Plan is incomplete — finish the wizard before applying.",
    };
  }

  // Acquire all four locks first — serializes against any concurrent
  // create-locked call on the same pair.
  await Promise.all([
    acquireTenantResourceLock(tx, organizationId, "racks"),
    acquireTenantResourceLock(tx, organizationId, "devices"),
    acquireTenantResourceLock(tx, organizationId, "subnets"),
    acquireTenantResourceLock(tx, organizationId, "vlans"),
  ]);

  const plan = await getOrganizationPlan(organizationId);
  const limits = TIER_LIMITS[plan];

  const [rackCount, deviceCount, subnetCount, vlanCount] = await Promise.all([
    tx.rack.count({ where: { organizationId } }),
    tx.device.count({ where: { organizationId } }),
    tx.subnet.count({ where: { organizationId } }),
    tx.vlan.count({ where: { organizationId } }),
  ]);

  if (Number.isFinite(limits.racks) && rackCount + 1 > limits.racks) {
    return {
      ok: false,
      error: `Plan needs 1 new rack but the ${limits.label} tier only allows ${Math.max(0, limits.racks - rackCount)} more.`,
    };
  }
  const requiredDevices = inputs.topology.selected.length;
  if (
    Number.isFinite(limits.devices) &&
    deviceCount + requiredDevices > limits.devices
  ) {
    return {
      ok: false,
      error: `Plan needs ${requiredDevices} new devices but the ${limits.label} tier only allows ${Math.max(0, limits.devices - deviceCount)} more.`,
    };
  }
  if (
    Number.isFinite(limits.subnets) &&
    subnetCount + inputs.network.vlans.length > limits.subnets
  ) {
    return {
      ok: false,
      error: `Plan needs ${inputs.network.vlans.length} new subnets but the ${limits.label} tier only allows ${Math.max(0, limits.subnets - subnetCount)} more.`,
    };
  }
  if (
    Number.isFinite(limits.vlans) &&
    vlanCount + inputs.network.vlans.length > limits.vlans
  ) {
    return {
      ok: false,
      error: `Plan needs ${inputs.network.vlans.length} new VLANs but the ${limits.label} tier only allows ${Math.max(0, limits.vlans - vlanCount)} more.`,
    };
  }

  return { ok: true, data: undefined };
}

/**
 * Atomic materialization. Throws on failure so the calling `$transaction`
 * rolls back every intermediate row. Caller is responsible for audit logging
 * and cache invalidation after the transaction commits.
 *
 * Pass an active Prisma `tx` so this can be composed with other operations
 * (e.g., flipping a `BuildPlan.status` row in the same transaction so that
 * "applied" status and the materialized rows are atomic together).
 */
export async function materializePlanInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  organizationId: string,
  inputs: WizardInputs,
): Promise<MaterializedIds> {
  if (!inputs.profile || !inputs.topology || !inputs.network) {
    throw new Error("Plan is incomplete — finish the wizard before applying.");
  }

  const parentParsed = calculateCidr(inputs.network.parentCidr);
  const ids: MaterializedIds = {
    rackId: "",
    deviceIds: [],
    vlanIds: [],
    subnetIds: [],
  };

  const rack = await tx.rack.create({
    data: {
      userId,
      organizationId,
      name: inputs.topology.rackName,
      sizeU: inputs.topology.rackSizeU,
      location: "",
      description: `Materialized from build plan — ${inputs.profile.siteType}`,
      colorTag: "blue",
    },
    select: { id: true },
  });
  ids.rackId = rack.id;

  let nextU = 1;
  for (const dev of inputs.topology.selected) {
    const created = await tx.device.create({
      data: {
        userId,
        organizationId,
        name: `${dev.manufacturer} ${dev.model}`.trim(),
        deviceType: dev.deviceType,
        manufacturer: dev.manufacturer,
        model: dev.model,
        sizeU: Math.max(1, dev.sizeU),
        portCount: dev.portCount,
        powerWatts: dev.powerWatts,
        notes: dev.reason,
        rackId: dev.sizeU > 0 ? rack.id : null,
        positionU: dev.sizeU > 0 ? nextU : null,
      },
      select: { id: true },
    });
    ids.deviceIds.push(created.id);
    if (dev.sizeU > 0) nextU += Math.max(1, dev.sizeU);
  }

  for (const vlan of inputs.network.vlans) {
    const vlanRow = await tx.vlan.create({
      data: {
        userId,
        organizationId,
        vlanId: vlan.vlanId,
        name: vlan.name,
        description: `From build plan — ${vlan.purpose}`,
        colorTag: "purple",
        purpose: vlan.purpose,
      },
      select: { id: true },
    });
    ids.vlanIds.push(vlanRow.id);

    const subnetCidr = synthesizeSubnetCidr(
      parentParsed.network,
      parentParsed.kind,
      vlan.subnetSuffix,
    );
    const subnet = await tx.subnet.create({
      data: {
        userId,
        organizationId,
        cidr: subnetCidr,
        name: `${vlan.name} subnet`,
        description: `Auto-created with VLAN ${vlan.vlanId}`,
        dnsServers: "",
        colorTag: "blue",
        vlanId: vlanRow.id,
      },
      select: { id: true },
    });
    ids.subnetIds.push(subnet.id);
  }

  return ids;
}

/**
 * Audit + cache-invalidation helper. Run AFTER the transaction commits.
 * Audit calls are issued in parallel because they're independent best-effort
 * writes — there's no ordering requirement and the function fails silently
 * on its own (see audit.ts). Cuts the post-transaction wait from O(n) serial
 * round-trips to a single Promise.all.
 */
export async function recordMaterialization(
  userId: string,
  organizationId: string,
  ids: MaterializedIds,
): Promise<void> {
  await Promise.all([
    audit({
      userId,
      organizationId,
      action: "created",
      entityType: "rack",
      entityId: ids.rackId,
      changes: { source: "build_plan" },
    }),
    ...ids.deviceIds.map((id) =>
      audit({
        userId,
        organizationId,
        action: "created",
        entityType: "device",
        entityId: id,
        changes: { source: "build_plan" },
      }),
    ),
    ...ids.vlanIds.map((id) =>
      audit({
        userId,
        organizationId,
        action: "created",
        entityType: "vlan",
        entityId: id,
        changes: { source: "build_plan" },
      }),
    ),
    ...ids.subnetIds.map((id) =>
      audit({
        userId,
        organizationId,
        action: "created",
        entityType: "subnet",
        entityId: id,
        changes: { source: "build_plan" },
      }),
    ),
  ]);
  invalidateRecommendations(organizationId);
}

// Slice a parent IPv4 /N into a /24 by replacing the third octet with
// `suffix`. wizardNetworkSchema rejects IPv6 at the validator layer; this
// throw is defense-in-depth so a future schema loosening can't silently
// produce VLANs with no subnets attached.
function synthesizeSubnetCidr(
  parentNetwork: string,
  kind: "ipv4" | "ipv6",
  suffix: number,
): string {
  if (kind !== "ipv4") {
    throw new Error(
      "Plan materialization requires an IPv4 parent CIDR — IPv6 slicing is not yet supported.",
    );
  }
  const octets = parentNetwork.split(".");
  if (octets.length !== 4) {
    throw new Error(`Parent CIDR network "${parentNetwork}" is malformed`);
  }
  octets[2] = String(Math.max(0, Math.min(255, suffix)));
  octets[3] = "0";
  return `${octets.join(".")}/24`;
}
