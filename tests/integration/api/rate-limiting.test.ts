import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { GET as racksGet } from "@/app/api/v1/racks/route";
import {
  seedOrgWithOwner,
  createTestApiKey,
  truncateAll,
} from "../factories";

describe("rate limiting", () => {
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(async () => {
    await truncateAll();
  });

  it("returns 429 once Pro quota (120/min) is exhausted", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const req = () =>
      racksGet(
        new Request("http://x/api/v1/racks", {
          headers: { Authorization: `Bearer ${cleartext}` },
        }),
        { params: Promise.resolve({}) },
      );

    // Burst up to the quota + 1 to hit the cap
    let last: Response | null = null;
    for (let i = 0; i < 121; i++) last = await req();
    expect(last).toBeTruthy();
    expect(last!.status).toBe(429);
    expect(last!.headers.get("Retry-After")).toBeTruthy();
    const body = await last!.json();
    expect(body.error.code).toBe("rate_limit_exceeded");
  }, 60_000); // 1-min timeout — 121 sequential DB inserts take ~5-15s
});
