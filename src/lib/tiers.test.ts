import { describe, expect, it } from "vitest";
import { TIER_LIMITS } from "./tiers";

describe("tier API fields", () => {
  it("free tier denies API access", () => {
    expect(TIER_LIMITS.free.apiAccess).toBe(false);
    expect(TIER_LIMITS.free.apiRateLimitPerMinute).toBe(0);
    expect(TIER_LIMITS.free.apiKeyMax).toBe(0);
  });
  it("pro tier has moderate API quotas", () => {
    expect(TIER_LIMITS.pro.apiAccess).toBe(true);
    expect(TIER_LIMITS.pro.apiRateLimitPerMinute).toBe(120);
    expect(TIER_LIMITS.pro.apiKeyMax).toBe(5);
  });
  it("business tier has generous API quotas", () => {
    expect(TIER_LIMITS.business.apiAccess).toBe(true);
    expect(TIER_LIMITS.business.apiRateLimitPerMinute).toBe(1200);
    expect(TIER_LIMITS.business.apiKeyMax).toBe(50);
  });
});
