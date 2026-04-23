import { describe, expect, it } from "vitest";
import { canCreateApiKeyLocked } from "@/lib/tiers";
import { seedOrgWithOwner } from "./factories";
import { withTenant } from "@/lib/prisma-tenant";

/**
 * Integration tests for the API-key tier-gate helper. Exercised via
 * `bun run test:integration`; the sibling cross-tenant suite shares the
 * same per-test truncation + RLS-enforced app role. Asserts both the deny
 * branch (Free tier has `apiKeyMax = 0`) and the allow branch (Pro under
 * cap) against the live DB.
 */
describe("canCreateApiKeyLocked", () => {
  it("denies on Free plan (apiKeyMax = 0)", async () => {
    const { organization } = await seedOrgWithOwner({ plan: "free" });
    const result = await withTenant(organization.id, (tx) =>
      canCreateApiKeyLocked(tx, organization.id),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Free");
      expect(result.resource).toBe("apiKeys");
    }
  });

  it("allows on Pro under cap", async () => {
    const { organization } = await seedOrgWithOwner({ plan: "pro" });
    const result = await withTenant(organization.id, (tx) =>
      canCreateApiKeyLocked(tx, organization.id),
    );
    expect(result.ok).toBe(true);
  });
});
