import "server-only";

import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { withTenant } from "./prisma-tenant";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "placed"
  | "unplaced"
  | "moved"
  | "signed_in"
  | "signed_out"
  | "password_changed"
  | "2fa_enabled"
  | "2fa_disabled"
  | "email_changed"
  | "scan_started"
  | "scan_completed"
  | "device_imported"
  | "device_discovered"
  | "profile_saved"
  | "profile_skipped"
  | "applied"
  | "discarded"
  | "dismissed"
  | "snoozed"
  | "restored"
  | "switched_active_organization"
  | "member_invited"
  | "member_removed"
  | "member_role_changed"
  | "invitation_revoked"
  | "invitation_resent"
  | "ownership_transferred";

export type AuditEntityType =
  | "user"
  | "session"
  | "rack"
  | "device"
  | "connection"
  | "discovery_scan"
  | "subnet"
  | "ip_assignment"
  | "dhcp_range"
  | "vlan"
  | "vlan_assignment"
  | "build_plan"
  | "recommendation"
  | "organization"
  | "invitation"
  | "member";

type AuditInput = {
  userId: string;
  organizationId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  /**
   * Optional: reuse an existing `withTenant` transaction instead of
   * opening a new one. Caller is responsible for ensuring the tx was
   * started with `withTenant(organizationId, ...)` — passing a tx with
   * a different org's session variable would trip the RLS policy and
   * throw from inside `auditLog.create`.
   *
   * Use this when an action wants the audit row to share atomicity
   * guarantees with its security-critical writes (e.g. a failed audit
   * rolls back the primary mutation, or vice versa). When omitted, the
   * default best-effort behavior (new tx, try/catch swallows errors)
   * applies.
   */
  tx?: Prisma.TransactionClient;
};

/**
 * Record an auditable action. Fails silently if Prisma throws — audit logs must
 * never block a user-facing mutation. IP + user-agent are captured best-effort
 * from request headers when available.
 *
 * When `input.tx` is provided, the audit row writes into that transaction
 * and errors propagate to the caller (the caller's outer tx handles
 * rollback). The "never block" rule only applies to the default
 * auto-wrapping mode.
 */
export async function audit(input: AuditInput): Promise<void> {
  const reqHeaders = await readHeadersSafe();
  const ipAddress =
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    reqHeaders.get("x-real-ip") ||
    null;
  const userAgent = reqHeaders.get("user-agent") || null;

  const metadata = {
    ...(input.metadata ?? {}),
    ...(ipAddress ? { ipAddress } : {}),
    ...(userAgent ? { userAgent } : {}),
  };

  const data = {
    id: crypto.randomUUID(),
    userId: input.userId,
    organizationId: input.organizationId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    changes: (input.changes ?? undefined) as Prisma.InputJsonValue,
    metadata: (Object.keys(metadata).length
      ? metadata
      : undefined) as Prisma.InputJsonValue,
  };

  // Caller-provided tx: write into the existing transaction and let errors
  // bubble up. The caller asked to share atomicity with the surrounding
  // mutation — a failed audit rolling back the primary write is the point.
  if (input.tx) {
    await input.tx.auditLog.create({ data });
    return;
  }

  // Default mode: open our own withTenant tx. AuditLog is tenant-scoped
  // and the FORCE RLS policy rejects writes that don't carry a matching
  // `app.organization_id`. Best-effort outer try/catch preserves the
  // "audit must never block a mutation" rule.
  try {
    await withTenant(input.organizationId, async (tx) => {
      await tx.auditLog.create({ data });
    });
  } catch (err) {
    console.error("[audit] failed to record event", err);
  }
}

async function readHeadersSafe() {
  try {
    return await headers();
  } catch {
    return new Headers();
  }
}
