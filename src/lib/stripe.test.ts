import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Stripe price ID helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("lookupPriceId returns the matching tier+cycle pair for known IDs", async () => {
    vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "price_pro_m_test");
    vi.stubEnv("STRIPE_PRICE_PRO_ANNUAL", "price_pro_a_test");
    vi.stubEnv("STRIPE_PRICE_BUSINESS_MONTHLY", "price_biz_m_test");
    vi.stubEnv("STRIPE_PRICE_BUSINESS_ANNUAL", "price_biz_a_test");
    const { lookupPriceId } = await import("./stripe");

    expect(lookupPriceId("price_pro_m_test")).toEqual({
      tier: "pro",
      cycle: "monthly",
    });
    expect(lookupPriceId("price_biz_a_test")).toEqual({
      tier: "business",
      cycle: "annual",
    });
  });

  it("lookupPriceId returns null for unknown IDs (audit-only path)", async () => {
    vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "price_pro_m_test");
    const { lookupPriceId } = await import("./stripe");
    expect(lookupPriceId("price_unrecognized")).toBeNull();
  });

  it("lookupPriceId never matches the empty string (unset env)", async () => {
    // None of the price envs set — every entry in the registry is "".
    // Looking up "" must NOT match (would otherwise spuriously match every
    // unconfigured tier).
    const { lookupPriceId } = await import("./stripe");
    expect(lookupPriceId("")).toBeNull();
  });

  it("getMissingStripeConfig flags every unset key", async () => {
    const { getMissingStripeConfig } = await import("./stripe");
    const missing = getMissingStripeConfig();
    expect(missing).toContain("STRIPE_SECRET_KEY");
    expect(missing).toContain("STRIPE_WEBHOOK_SECRET");
    expect(missing).toContain("STRIPE_PRICE_PRO_MONTHLY");
    expect(missing).toContain("STRIPE_PRICE_PRO_ANNUAL");
    expect(missing).toContain("STRIPE_PRICE_BUSINESS_MONTHLY");
    expect(missing).toContain("STRIPE_PRICE_BUSINESS_ANNUAL");
  });

  it("getMissingStripeConfig returns empty when all 6 keys are set", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
    vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "price_a");
    vi.stubEnv("STRIPE_PRICE_PRO_ANNUAL", "price_b");
    vi.stubEnv("STRIPE_PRICE_BUSINESS_MONTHLY", "price_c");
    vi.stubEnv("STRIPE_PRICE_BUSINESS_ANNUAL", "price_d");
    const { getMissingStripeConfig } = await import("./stripe");
    expect(getMissingStripeConfig()).toEqual([]);
  });
});
