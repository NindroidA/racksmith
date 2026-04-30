import { describe, expect, it, vi } from "vitest";

vi.mock("./stripe", () => ({
  lookupPriceId: (id: string) => {
    if (id === "price_pro_m") return { tier: "pro", cycle: "monthly" };
    if (id === "price_biz_a") return { tier: "business", cycle: "annual" };
    return null;
  },
}));

import {
  derivePlanFromSubscription,
  mapSubscriptionStatus,
  planExpiresAtFromSubscription,
} from "./stripe-helpers";
import type Stripe from "stripe";

function fakeSub(overrides: {
  priceId?: string;
  status?: Stripe.Subscription.Status;
  periodEnd?: number;
} = {}): Stripe.Subscription {
  return {
    id: "sub_x",
    status: overrides.status ?? "active",
    items: {
      data: [
        {
          id: "si_x",
          price: { id: overrides.priceId ?? "price_pro_m" },
          current_period_end: overrides.periodEnd ?? 1900000000,
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

describe("derivePlanFromSubscription", () => {
  it("returns the tier for a known price ID", () => {
    expect(derivePlanFromSubscription(fakeSub({ priceId: "price_pro_m" }))).toBe(
      "pro",
    );
    expect(
      derivePlanFromSubscription(fakeSub({ priceId: "price_biz_a" })),
    ).toBe("business");
  });

  it("returns null for an unknown price ID (manual Stripe-dashboard edit)", () => {
    expect(
      derivePlanFromSubscription(fakeSub({ priceId: "price_unknown" })),
    ).toBeNull();
  });

  it("returns null when the subscription has no items", () => {
    const sub = {
      id: "sub_y",
      items: { data: [] },
    } as unknown as Stripe.Subscription;
    expect(derivePlanFromSubscription(sub)).toBeNull();
  });
});

describe("mapSubscriptionStatus", () => {
  it("collapses Stripe statuses into the 4-state DB enum", () => {
    expect(mapSubscriptionStatus("active")).toBe("active");
    expect(mapSubscriptionStatus("trialing")).toBe("active");
    expect(mapSubscriptionStatus("past_due")).toBe("past_due");
    expect(mapSubscriptionStatus("canceled")).toBe("canceled");
    expect(mapSubscriptionStatus("unpaid")).toBe("canceled");
    expect(mapSubscriptionStatus("incomplete_expired")).toBe("canceled");
    expect(mapSubscriptionStatus("paused")).toBe("canceled");
    expect(mapSubscriptionStatus("incomplete")).toBe("incomplete");
  });
});

describe("planExpiresAtFromSubscription", () => {
  it("converts Stripe's seconds-since-epoch to a Date", () => {
    const result = planExpiresAtFromSubscription(
      fakeSub({ periodEnd: 1900000000 }),
    );
    expect(result).toEqual(new Date(1900000000 * 1000));
  });

  it("returns null when there's no period", () => {
    const sub = fakeSub();
    // Strip the period_end completely
    (sub.items.data[0] as { current_period_end?: number }).current_period_end =
      undefined;
    expect(planExpiresAtFromSubscription(sub)).toBeNull();
  });

  it("returns null for non-numeric / zero values", () => {
    expect(
      planExpiresAtFromSubscription(fakeSub({ periodEnd: 0 })),
    ).toBeNull();
  });
});
