import { describe, expect, it, vi } from "vitest";
import { revokeKeysCreatedByUser } from "./key-lifecycle";

// Unit tests for the pure-SQL helper. End-to-end behavior (advisory locks,
// cascading audit rows, tenant isolation) is covered by the integration suite
// in tests/integration/api/orphan-key-revocation.test.ts.
describe("revokeKeysCreatedByUser", () => {
  it("returns an empty list when the user has no active keys", async () => {
    const tx = {
      apiKey: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn(),
      },
    } as any;
    const ids = await revokeKeysCreatedByUser(tx, "org1", "user1");
    expect(ids).toEqual([]);
    expect(tx.apiKey.findMany).toHaveBeenCalledOnce();
    expect(tx.apiKey.updateMany).not.toHaveBeenCalled();
  });

  it("revokes every active key and returns their IDs", async () => {
    const tx = {
      apiKey: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: "key_a" }, { id: "key_b" }, { id: "key_c" }]),
        updateMany: vi.fn().mockResolvedValue({ count: 3 }),
      },
    } as any;
    const ids = await revokeKeysCreatedByUser(tx, "org1", "user1");
    expect(ids).toEqual(["key_a", "key_b", "key_c"]);
    expect(tx.apiKey.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["key_a", "key_b", "key_c"] } },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("filters on organizationId + createdByUserId + revokedAt=null", async () => {
    const tx = {
      apiKey: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn(),
      },
    } as any;
    await revokeKeysCreatedByUser(tx, "org_xyz", "user_abc");
    expect(tx.apiKey.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org_xyz",
        createdByUserId: "user_abc",
        revokedAt: null,
      },
      select: { id: true },
    });
  });
});
