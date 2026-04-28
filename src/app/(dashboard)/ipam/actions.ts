"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import {
  handleZodError,
  tierDenial,
  withActionEnvelope,
} from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/action-types";
import { canCreateSubnetLocked } from "@/lib/tiers";
import {
  subnetSchema,
  dhcpRangeSchema,
  ipAssignmentSchema,
  type SubnetInput,
  type DhcpRangeInput,
  type IpAssignmentInput,
} from "@/lib/validators";
import {
  cidrsOverlap,
  isValidCidr,
  isValidIp,
  normalizeCidr,
  normalizeIp,
  suggestNextIp as suggestNextIpImpl,
  validateDhcpRange,
  validateIpAssignment,
} from "@/lib/ip";

// ─── Subnet CRUD ──────────────────────────────────

export async function createSubnet(
  input: SubnetInput,
): Promise<ActionResult<{ id: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = subnetSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    if (!isValidCidr(parsed.data.cidr)) {
      return { ok: false, error: "Invalid CIDR" };
    }
    if (parsed.data.gateway && !isValidIp(parsed.data.gateway)) {
      return { ok: false, error: "Invalid gateway IP" };
    }

    const canonicalCidr = normalizeCidr(parsed.data.cidr);

    const result = await withTenant(organizationId, async (tx) => {
      const check = await canCreateSubnetLocked(tx, organizationId);
      if (!check.ok) return { kind: "denied" as const, check };

      const existing = await tx.subnet.findMany({
        where: { organizationId },
        select: { cidr: true },
      });

      const overlap = existing.find((s) => cidrsOverlap(canonicalCidr, s.cidr));
      if (overlap) {
        return { kind: "overlap" as const, cidr: overlap.cidr };
      }

      const subnet = await tx.subnet.create({
        data: {
          userId: session.user.id,
          organizationId,
          cidr: canonicalCidr,
          name: parsed.data.name,
          description: parsed.data.description,
          gateway: parsed.data.gateway
            ? normalizeIp(parsed.data.gateway)
            : null,
          dnsServers: parsed.data.dnsServers,
          colorTag: parsed.data.colorTag,
        },
        select: { id: true },
      });

      return { kind: "ok" as const, subnet };
    });

    if (result.kind === "denied") return tierDenial(result.check);
    if (result.kind === "overlap") {
      return {
        ok: false,
        error: `CIDR overlaps existing subnet ${result.cidr}`,
      };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "created",
      entityType: "subnet",
      entityId: result.subnet.id,
      changes: { cidr: canonicalCidr, name: parsed.data.name },
    });

    revalidatePath("/ipam");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: result.subnet.id } };
  }, "Failed to create subnet");
}

export async function updateSubnet(
  id: string,
  input: SubnetInput,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = subnetSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    if (!isValidCidr(parsed.data.cidr)) {
      return { ok: false, error: "Invalid CIDR" };
    }
    if (parsed.data.gateway && !isValidIp(parsed.data.gateway)) {
      return { ok: false, error: "Invalid gateway IP" };
    }

    const canonicalCidr = normalizeCidr(parsed.data.cidr);

    const result = await withTenant(organizationId, async (tx) => {
      const siblings = await tx.subnet.findMany({
        where: { organizationId, NOT: { id } },
        select: { cidr: true },
      });
      const overlap = siblings.find((s) => cidrsOverlap(canonicalCidr, s.cidr));
      if (overlap) {
        return { kind: "overlap" as const, cidr: overlap.cidr };
      }

      const updated = await tx.subnet.updateMany({
        where: { id, organizationId },
        data: {
          cidr: canonicalCidr,
          name: parsed.data.name,
          description: parsed.data.description,
          gateway: parsed.data.gateway
            ? normalizeIp(parsed.data.gateway)
            : null,
          dnsServers: parsed.data.dnsServers,
          colorTag: parsed.data.colorTag,
        },
      });

      return { kind: "ok" as const, count: updated.count };
    });

    if (result.kind === "overlap") {
      return {
        ok: false,
        error: `CIDR overlaps existing subnet ${result.cidr}`,
      };
    }

    if (result.count === 0) return { ok: false, error: "Subnet not found" };

    await audit({
      userId: session.user.id,
      organizationId,
      action: "updated",
      entityType: "subnet",
      entityId: id,
      changes: { cidr: canonicalCidr, name: parsed.data.name },
    });

    revalidatePath("/ipam");
    revalidatePath(`/ipam/${id}`);
    return { ok: true, data: undefined };
  }, "Failed to update subnet");
}

export async function deleteSubnet(id: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const count = await withTenant(organizationId, async (tx) => {
      const result = await tx.subnet.deleteMany({
        where: { id, organizationId },
      });
      return result.count;
    });
    if (count === 0) return { ok: false, error: "Subnet not found" };

    await audit({
      userId: session.user.id,
      organizationId,
      action: "deleted",
      entityType: "subnet",
      entityId: id,
    });

    revalidatePath("/ipam");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  }, "Failed to delete subnet");
}

// ─── DHCP Range CRUD ──────────────────────────────

export async function createDhcpRange(
  input: DhcpRangeInput,
): Promise<ActionResult<{ id: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = dhcpRangeSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    if (!isValidIp(parsed.data.startIp) || !isValidIp(parsed.data.endIp)) {
      return { ok: false, error: "Invalid start or end IP" };
    }

    const startIp = normalizeIp(parsed.data.startIp);
    const endIp = normalizeIp(parsed.data.endIp);

    const result = await withTenant(organizationId, async (tx) => {
      const subnet = await tx.subnet.findFirst({
        where: { id: parsed.data.subnetId, organizationId },
        include: {
          dhcpRanges: { select: { startIp: true, endIp: true } },
          assignments: { select: { ipAddress: true, status: true } },
        },
      });
      if (!subnet) return { kind: "notfound" as const };

      const check = validateDhcpRange(
        subnet,
        startIp,
        endIp,
        subnet.dhcpRanges,
        subnet.assignments,
      );
      if (!check.ok) return { kind: "invalid" as const, error: check.error };

      const created = await tx.dhcpRange.create({
        data: {
          userId: session.user.id,
          organizationId,
          subnetId: subnet.id,
          startIp,
          endIp,
          label: parsed.data.label,
        },
        select: { id: true },
      });

      return { kind: "ok" as const, subnetId: subnet.id, created };
    });

    if (result.kind === "notfound") {
      return { ok: false, error: "Subnet not found" };
    }
    if (result.kind === "invalid") {
      return { ok: false, error: result.error };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "created",
      entityType: "dhcp_range",
      entityId: result.created.id,
      changes: { subnetId: result.subnetId, startIp, endIp },
    });

    revalidatePath(`/ipam/${result.subnetId}`);
    return { ok: true, data: { id: result.created.id } };
  }, "Failed to add DHCP range");
}

export async function deleteDhcpRange(id: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const result = await withTenant(organizationId, async (tx) => {
      const range = await tx.dhcpRange.findFirst({
        where: { id, organizationId },
        select: { subnetId: true },
      });
      if (!range) return { kind: "notfound" as const };

      await tx.dhcpRange.delete({ where: { id } });
      return { kind: "ok" as const, subnetId: range.subnetId };
    });

    if (result.kind === "notfound") {
      return { ok: false, error: "Range not found" };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "deleted",
      entityType: "dhcp_range",
      entityId: id,
    });

    revalidatePath(`/ipam/${result.subnetId}`);
    return { ok: true, data: undefined };
  }, "Failed to delete range");
}

// ─── IP Assignment CRUD ───────────────────────────

export async function createIpAssignment(
  input: IpAssignmentInput,
): Promise<ActionResult<{ id: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = ipAssignmentSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    if (!isValidIp(parsed.data.ipAddress)) {
      return { ok: false, error: "Invalid IP" };
    }

    const ipAddress = normalizeIp(parsed.data.ipAddress);

    const result = await withTenant(organizationId, async (tx) => {
      const subnet = await tx.subnet.findFirst({
        where: { id: parsed.data.subnetId, organizationId },
        include: {
          dhcpRanges: { select: { startIp: true, endIp: true } },
          assignments: { select: { id: true, ipAddress: true, status: true } },
        },
      });
      if (!subnet) return { kind: "subnet_notfound" as const };

      const check = validateIpAssignment(
        subnet,
        ipAddress,
        parsed.data.status,
        subnet.dhcpRanges,
        subnet.assignments,
      );
      if (!check.ok) return { kind: "invalid" as const, error: check.error };

      if (parsed.data.deviceId) {
        const device = await tx.device.findFirst({
          where: { id: parsed.data.deviceId, organizationId },
          select: { id: true },
        });
        if (!device) return { kind: "device_notfound" as const };
      }

      const assignment = await tx.ipAssignment.create({
        data: {
          userId: session.user.id,
          organizationId,
          subnetId: subnet.id,
          ipAddress,
          deviceId: parsed.data.deviceId ?? null,
          status: parsed.data.status,
          notes: parsed.data.notes,
        },
        select: { id: true },
      });

      return { kind: "ok" as const, subnetId: subnet.id, assignment };
    });

    if (result.kind === "subnet_notfound") {
      return { ok: false, error: "Subnet not found" };
    }
    if (result.kind === "device_notfound") {
      return { ok: false, error: "Device not found" };
    }
    if (result.kind === "invalid") {
      return { ok: false, error: result.error };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "created",
      entityType: "ip_assignment",
      entityId: result.assignment.id,
      changes: {
        subnetId: result.subnetId,
        ipAddress,
        status: parsed.data.status,
        deviceId: parsed.data.deviceId ?? null,
      },
    });

    revalidatePath(`/ipam/${result.subnetId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { id: result.assignment.id } };
  }, "Failed to assign IP");
}

export async function updateIpAssignment(
  id: string,
  input: IpAssignmentInput,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const parsed = ipAssignmentSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    if (!isValidIp(parsed.data.ipAddress)) {
      return { ok: false, error: "Invalid IP" };
    }

    const ipAddress = normalizeIp(parsed.data.ipAddress);

    const result = await withTenant(organizationId, async (tx) => {
      const subnet = await tx.subnet.findFirst({
        where: { id: parsed.data.subnetId, organizationId },
        include: {
          dhcpRanges: { select: { startIp: true, endIp: true } },
          assignments: { select: { id: true, ipAddress: true, status: true } },
        },
      });
      if (!subnet) return { kind: "notfound" as const };

      const others = subnet.assignments.filter((a) => a.id !== id);
      const check = validateIpAssignment(
        subnet,
        ipAddress,
        parsed.data.status,
        subnet.dhcpRanges,
        others,
      );
      if (!check.ok) return { kind: "invalid" as const, error: check.error };

      const updated = await tx.ipAssignment.updateMany({
        where: { id, organizationId },
        data: {
          ipAddress,
          status: parsed.data.status,
          notes: parsed.data.notes,
          deviceId: parsed.data.deviceId ?? null,
        },
      });

      return { kind: "ok" as const, subnetId: subnet.id, count: updated.count };
    });

    if (result.kind === "notfound") {
      return { ok: false, error: "Subnet not found" };
    }
    if (result.kind === "invalid") {
      return { ok: false, error: result.error };
    }
    if (result.count === 0) return { ok: false, error: "Assignment not found" };

    await audit({
      userId: session.user.id,
      organizationId,
      action: "updated",
      entityType: "ip_assignment",
      entityId: id,
      changes: { ipAddress, status: parsed.data.status },
    });

    revalidatePath(`/ipam/${result.subnetId}`);
    return { ok: true, data: undefined };
  }, "Failed to update assignment");
}

export async function deleteIpAssignment(id: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const result = await withTenant(organizationId, async (tx) => {
      const assignment = await tx.ipAssignment.findFirst({
        where: { id, organizationId },
        select: { subnetId: true },
      });
      if (!assignment) return { kind: "notfound" as const };

      await tx.ipAssignment.delete({ where: { id } });
      return { kind: "ok" as const, subnetId: assignment.subnetId };
    });

    if (result.kind === "notfound") {
      return { ok: false, error: "Assignment not found" };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "deleted",
      entityType: "ip_assignment",
      entityId: id,
    });

    revalidatePath(`/ipam/${result.subnetId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  }, "Failed to delete assignment");
}

// ─── Next-IP suggester (server action) ────────────

export async function suggestNextIp(
  subnetId: string,
): Promise<ActionResult<{ ip: string | null }>> {
  return withActionEnvelope(async () => {
    const { organizationId } = await requireMember("member");

    const subnet = await withTenant(organizationId, (tx) =>
      tx.subnet.findFirst({
        where: { id: subnetId, organizationId },
        include: {
          dhcpRanges: { select: { startIp: true, endIp: true } },
          assignments: { select: { ipAddress: true } },
        },
      }),
    );
    if (!subnet) return { ok: false, error: "Subnet not found" };

    const ip = suggestNextIpImpl(
      { cidr: subnet.cidr, gateway: subnet.gateway },
      subnet.assignments,
      subnet.dhcpRanges,
    );

    return { ok: true, data: { ip } };
  }, "Failed to suggest IP");
}
