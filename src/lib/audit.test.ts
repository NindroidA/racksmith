import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks: stub the side-effecting modules audit() reaches into.
const mockHeaders = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => mockHeaders.get(name.toLowerCase()) ?? null,
  })),
}));

const tenantTx = {
  auditLog: { create: vi.fn() },
};
const withTenantSpy = vi.fn(
  async (
    _orgId: string,
    fn: (tx: typeof tenantTx) => Promise<unknown>,
  ) => fn(tenantTx),
);
vi.mock("./prisma-tenant", () => ({
  withTenant: (orgId: string, fn: (tx: typeof tenantTx) => Promise<unknown>) =>
    withTenantSpy(orgId, fn),
}));

import { audit } from "./audit";

const baseInput = {
  userId: "user_1",
  organizationId: "org_1",
  action: "created" as const,
  entityType: "rack" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockHeaders.clear();
  // Silence the fallthrough console.error so test output stays readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("audit() — default mode (auto-wrap in withTenant)", () => {
  it("opens a withTenant scope keyed on organizationId", async () => {
    await audit({ ...baseInput });
    expect(withTenantSpy).toHaveBeenCalledTimes(1);
    expect(withTenantSpy.mock.calls[0]?.[0]).toBe("org_1");
  });

  it("writes the row via tx.auditLog.create with a generated UUID id", async () => {
    await audit({ ...baseInput, entityId: "rack_42" });
    expect(tenantTx.auditLog.create).toHaveBeenCalledTimes(1);
    const args = tenantTx.auditLog.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(args.data).toMatchObject({
      userId: "user_1",
      organizationId: "org_1",
      action: "created",
      entityType: "rack",
      entityId: "rack_42",
    });
    expect(typeof args.data.id).toBe("string");
    expect((args.data.id as string).length).toBeGreaterThan(0);
  });

  it("normalizes optional fields: entityId default null, omitted changes/metadata become undefined", async () => {
    await audit({ ...baseInput });
    const data = tenantTx.auditLog.create.mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >;
    expect(data.entityId).toBeNull();
    expect(data.changes).toBeUndefined();
    expect(data.metadata).toBeUndefined();
  });

  it("forwards changes when provided", async () => {
    await audit({
      ...baseInput,
      changes: { sizeU: { from: 24, to: 42 } },
    });
    const data = tenantTx.auditLog.create.mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >;
    expect(data.changes).toEqual({ sizeU: { from: 24, to: 42 } });
  });

  it("merges request headers (x-forwarded-for, user-agent) into metadata", async () => {
    mockHeaders.set("x-forwarded-for", "203.0.113.5, 10.0.0.1");
    mockHeaders.set("user-agent", "vitest/4");
    await audit({ ...baseInput, metadata: { source: "ui" } });
    const data = tenantTx.auditLog.create.mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >;
    // Only the FIRST forwarded-for hop is recorded (the rest are proxies).
    expect(data.metadata).toEqual({
      source: "ui",
      ipAddress: "203.0.113.5",
      userAgent: "vitest/4",
    });
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", async () => {
    mockHeaders.set("x-real-ip", "198.51.100.7");
    await audit({ ...baseInput });
    const data = tenantTx.auditLog.create.mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >;
    expect((data.metadata as { ipAddress: string }).ipAddress).toBe(
      "198.51.100.7",
    );
  });

  it("does NOT inject ipAddress / userAgent keys when no headers are present", async () => {
    await audit({ ...baseInput });
    const data = tenantTx.auditLog.create.mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >;
    // metadata stays undefined when there's nothing to record.
    expect(data.metadata).toBeUndefined();
  });

  it("swallows Prisma errors so a failed audit cannot block the parent mutation", async () => {
    tenantTx.auditLog.create.mockRejectedValueOnce(new Error("RLS violation"));
    // Should resolve, NOT throw.
    await expect(audit({ ...baseInput })).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      "[audit] failed to record event",
      expect.any(Error),
    );
  });

  it("handles `headers()` itself throwing (RSC-only context) without surfacing the error", async () => {
    const { headers } = await import("next/headers");
    vi.mocked(headers).mockRejectedValueOnce(
      new Error("called outside request scope") as never,
    );
    await expect(audit({ ...baseInput })).resolves.toBeUndefined();
    // The write still went through (no headers to merge means no metadata
    // mutation, but the row itself is still recorded).
    expect(tenantTx.auditLog.create).toHaveBeenCalled();
  });
});

describe("audit() — caller-supplied tx mode", () => {
  it("writes into the supplied tx without opening withTenant", async () => {
    const externalTx = {
      auditLog: { create: vi.fn().mockResolvedValue(undefined) },
    };
    await audit({
      ...baseInput,
      tx: externalTx as never,
    });
    expect(externalTx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(withTenantSpy).not.toHaveBeenCalled();
  });

  it("propagates errors from the supplied tx (no swallowing) — caller's outer tx handles rollback", async () => {
    const externalTx = {
      auditLog: {
        create: vi.fn().mockRejectedValue(new Error("RLS violation")),
      },
    };
    await expect(
      audit({ ...baseInput, tx: externalTx as never }),
    ).rejects.toThrow("RLS violation");
  });
});
