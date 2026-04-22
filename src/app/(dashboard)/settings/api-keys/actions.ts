"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { canCreateApiKeyLocked } from "@/lib/tiers";
import { generateApiKey } from "@/lib/api/api-key-crypto";
import {
  withActionEnvelope,
  handleZodError,
  tierDenial,
} from "@/lib/action-helpers";
import { cuidSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/action-types";

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  role: z.enum(["member", "admin"]),
  expiresInDays: z.number().int().min(1).max(3650).nullable(),
});

/**
 * Create a new API key for the caller's active organization. Returns the
 * cleartext ONCE — never retrievable again after this response. Admin role
 * required (matches the "admin-only API key management" convention).
 */
export async function createApiKey(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult<{ id: string; cleartext: string; prefix: string }>> {
  return withActionEnvelope(async () => {
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    const { session, organizationId } = await requireMember("admin");

    // Tier-gated advisory-locked count check. Must run inside withTenant
    // even though ApiKey is non-tenant — the helper's advisory lock is
    // scoped to the org and uses the tx's session variables.
    const denial = await withTenant(organizationId, (tx) =>
      canCreateApiKeyLocked(tx, organizationId),
    );
    if (!denial.ok) return tierDenial(denial);

    const { cleartext, hash, prefix } = generateApiKey();
    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const key = await prisma.apiKey.create({
      data: {
        organizationId,
        createdByUserId: session.user.id,
        name: parsed.data.name,
        role: parsed.data.role,
        prefix,
        hash,
        expiresAt,
      },
      select: { id: true },
    });

    await audit({
      userId: session.user.id,
      organizationId,
      action: "api_key_created",
      entityType: "api_key",
      entityId: key.id,
      changes: {
        name: parsed.data.name,
        role: parsed.data.role,
        expiresAt,
      },
    });

    revalidatePath("/settings/api-keys");
    return { ok: true, data: { id: key.id, cleartext, prefix } };
  }, "Failed to create API key");
}

/**
 * Revoke an API key by soft-delete (sets revokedAt=now). Subsequent auth
 * attempts with this key return 401 via requireApiKey's isRevoked gate.
 * Admin role required.
 */
export async function revokeApiKey(keyId: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const idCheck = cuidSchema.safeParse(keyId);
    if (!idCheck.success) return { ok: false, error: "Invalid key id" };

    const { session, organizationId } = await requireMember("admin");

    // ApiKey is non-tenant but we still filter by organizationId on the
    // updateMany so a key from a different org can't be revoked.
    const result = await prisma.apiKey.updateMany({
      where: { id: idCheck.data, organizationId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      return { ok: false, error: "Key not found or already revoked" };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "api_key_revoked",
      entityType: "api_key",
      entityId: idCheck.data,
    });

    revalidatePath("/settings/api-keys");
    return { ok: true, data: undefined };
  }, "Failed to revoke API key");
}
