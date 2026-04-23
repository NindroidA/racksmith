import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkAndRecord, RATE_LIMIT_WINDOW_SECONDS } from "./rate-limit";

// We mock the tx so we can unit-test the logic cleanly. Real DB behavior
// is covered by rate-limiting.test.ts in tests/integration/api/.
describe("rate-limit checkAndRecord", () => {
  beforeEach(() => vi.resetAllMocks());

  it("allows request under quota, returns decremented remaining", async () => {
    const tx = {
      apiRequestLog: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { weight: 5 } }),
        create: vi.fn().mockResolvedValue({ id: "req_123" }),
      },
    } as any;
    const result = await checkAndRecord(tx, {
      apiKeyId: "k1",
      organizationId: "org1",
      quotaPerMinute: 120,
      weight: 1,
      requestId: "req_123",
      method: "GET",
      path: "/api/v1/racks",
      responseStatus: 200,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(114); // 120 - 5 (prior) - 1 (this)
    expect(tx.apiRequestLog.create).toHaveBeenCalledOnce();
  });

  it("rejects when prior + new weight exceeds quota", async () => {
    const tx = {
      apiRequestLog: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { weight: 120 } }),
        create: vi.fn(),
      },
    } as any;
    const result = await checkAndRecord(tx, {
      apiKeyId: "k1",
      organizationId: "org1",
      quotaPerMinute: 120,
      weight: 1,
      requestId: "req_abc",
      method: "POST",
      path: "/api/v1/devices",
      responseStatus: 429,
    });
    expect(result.allowed).toBe(false);
    expect(tx.apiRequestLog.create).not.toHaveBeenCalled();
  });

  it("treats a null sum (no prior requests) as 0", async () => {
    const tx = {
      apiRequestLog: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { weight: null } }),
        create: vi.fn().mockResolvedValue({ id: "req_1" }),
      },
    } as any;
    const result = await checkAndRecord(tx, {
      apiKeyId: "k1",
      organizationId: "org1",
      quotaPerMinute: 120,
      weight: 1,
      requestId: "req_1",
      method: "GET",
      path: "/api/v1/racks",
      responseStatus: 200,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(119);
  });
});

describe("RATE_LIMIT_WINDOW_SECONDS", () => {
  it("is 60", () => {
    expect(RATE_LIMIT_WINDOW_SECONDS).toBe(60);
  });
});
