"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { handleZodError, withActionEnvelope } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/action-types";
import { invalidateRecommendations } from "@/lib/recommendations/cache";
import {
  dismissRecommendationSchema,
  type DismissRecommendationInput,
} from "@/lib/validators";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Same shape as the dismiss schema but without the snoozeDays field.
const undismissSchema = z.object({
  ruleKey: z.string().trim().min(1).max(80),
  entityKey: z.string().trim().min(1).max(120),
});

export async function dismissRecommendation(
  input: DismissRecommendationInput,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");
    const parsed = dismissRecommendationSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false, error: handleZodError(parsed.error) };

    const expiresAt =
      parsed.data.snoozeDays && parsed.data.snoozeDays > 0
        ? new Date(Date.now() + parsed.data.snoozeDays * ONE_DAY_MS)
        : null;

    await withTenant(organizationId, (tx) =>
      tx.recommendationDismissal.upsert({
        where: {
          organizationId_ruleKey_entityKey: {
            organizationId,
            ruleKey: parsed.data.ruleKey,
            entityKey: parsed.data.entityKey,
          },
        },
        create: {
          userId: session.user.id,
          organizationId,
          ruleKey: parsed.data.ruleKey,
          entityKey: parsed.data.entityKey,
          expiresAt,
        },
        update: { expiresAt, dismissedAt: new Date() },
      }),
    );

    await audit({
      userId: session.user.id,
      organizationId,
      action: parsed.data.snoozeDays ? "snoozed" : "dismissed",
      entityType: "recommendation",
      changes: {
        ruleKey: parsed.data.ruleKey,
        entityKey: parsed.data.entityKey,
        snoozeDays: parsed.data.snoozeDays ?? null,
      },
    });

    invalidateRecommendations(organizationId);
    revalidatePath("/dashboard");
    revalidatePath("/network-tools/recommendations");
    return { ok: true, data: undefined };
  }, "Failed to dismiss recommendation");
}

export async function undismissRecommendation(
  ruleKey: string,
  entityKey: string,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");
    const parsed = undismissSchema.safeParse({ ruleKey, entityKey });
    if (!parsed.success)
      return { ok: false, error: handleZodError(parsed.error) };

    const result = await withTenant(organizationId, (tx) =>
      tx.recommendationDismissal.deleteMany({
        where: {
          organizationId,
          ruleKey: parsed.data.ruleKey,
          entityKey: parsed.data.entityKey,
        },
      }),
    );
    if (result.count === 0) return { ok: false, error: "No matching dismissal" };

    await audit({
      userId: session.user.id,
      organizationId,
      action: "restored",
      entityType: "recommendation",
      changes: {
        ruleKey: parsed.data.ruleKey,
        entityKey: parsed.data.entityKey,
      },
    });

    invalidateRecommendations(organizationId);
    revalidatePath("/dashboard");
    revalidatePath("/network-tools/recommendations");
    return { ok: true, data: undefined };
  }, "Failed to restore recommendation");
}
