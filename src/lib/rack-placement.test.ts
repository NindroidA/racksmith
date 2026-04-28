import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateRackPlacement } from "./rack-placement";

// Stub `withTenant` so tests don't need a real DB. The wrapper is exercised
// in the cross-tenant integration suite — here we only care that placement
// math (height, slot collision, exclude-self) is correct given a known set
// of installed devices.
const mockTx = {
  rack: { findFirst: vi.fn() },
  device: { findMany: vi.fn() },
};

vi.mock("./prisma-tenant", () => ({
  withTenant: vi.fn(
    async (
      _orgId: string,
      fn: (tx: typeof mockTx) => Promise<unknown>,
    ) => fn(mockTx),
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const placement = (overrides: Partial<Parameters<typeof validateRackPlacement>[0]> = {}) => ({
  organizationId: "org_1",
  rackId: "rack_1",
  sizeU: 1,
  positionU: 1,
  ...overrides,
});

const mockRack = (sizeU: number | null) =>
  vi
    .mocked(mockTx.rack.findFirst)
    .mockResolvedValue(sizeU === null ? null : { sizeU });

const mockInstalled = (
  installed: Array<{ positionU: number | null; sizeU: number }>,
) => vi.mocked(mockTx.device.findMany).mockResolvedValue(installed);

describe("validateRackPlacement", () => {
  describe("rack lookup", () => {
    it("returns { ok: false } with 'Rack not found' when rack is missing", async () => {
      mockRack(null);
      const result = await validateRackPlacement(placement());
      expect(result).toEqual({ ok: false, error: "Rack not found" });
    });
  });

  describe("height bounds", () => {
    beforeEach(() => {
      mockRack(42);
      mockInstalled([]);
    });

    it("rejects positionU < 1", async () => {
      const result = await validateRackPlacement(
        placement({ positionU: 0, sizeU: 1 }),
      );
      expect(result).toEqual({
        ok: false,
        error: "Position must be 1U or higher",
      });
    });

    it("rejects negative positionU", async () => {
      const result = await validateRackPlacement(
        placement({ positionU: -3, sizeU: 1 }),
      );
      expect(result.ok).toBe(false);
    });

    it("accepts positionU == 1 (bottom of rack)", async () => {
      const result = await validateRackPlacement(
        placement({ positionU: 1, sizeU: 1 }),
      );
      expect(result).toEqual({ ok: true });
    });

    it("accepts a device that exactly fills the top slot (sizeU=1, positionU=42 in 42U)", async () => {
      const result = await validateRackPlacement(
        placement({ positionU: 42, sizeU: 1 }),
      );
      expect(result).toEqual({ ok: true });
    });

    it("accepts a 4U device occupying slots 39-42 in a 42U rack", async () => {
      const result = await validateRackPlacement(
        placement({ positionU: 39, sizeU: 4 }),
      );
      expect(result).toEqual({ ok: true });
    });

    it("rejects a 4U device starting at 40 (would need slots 40-43 in a 42U rack)", async () => {
      const result = await validateRackPlacement(
        placement({ positionU: 40, sizeU: 4 }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("past the top");
    });

    it("rejects a 1U device at position 43 in a 42U rack", async () => {
      const result = await validateRackPlacement(
        placement({ positionU: 43, sizeU: 1 }),
      );
      expect(result.ok).toBe(false);
    });
  });

  describe("collision detection", () => {
    it("accepts placement when rack is empty", async () => {
      mockRack(42);
      mockInstalled([]);
      const result = await validateRackPlacement(
        placement({ positionU: 10, sizeU: 2 }),
      );
      expect(result).toEqual({ ok: true });
    });

    it("rejects placement that overlaps an installed device", async () => {
      mockRack(42);
      // Device at 10-11 (sizeU=2)
      mockInstalled([{ positionU: 10, sizeU: 2 }]);
      const result = await validateRackPlacement(
        placement({ positionU: 11, sizeU: 1 }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/Slot 11U is already occupied/);
    });

    it("accepts placement immediately above an installed device", async () => {
      mockRack(42);
      // Device at 10-11 (sizeU=2). New device at 12 should fit.
      mockInstalled([{ positionU: 10, sizeU: 2 }]);
      const result = await validateRackPlacement(
        placement({ positionU: 12, sizeU: 1 }),
      );
      expect(result).toEqual({ ok: true });
    });

    it("accepts placement immediately below an installed device", async () => {
      mockRack(42);
      // Device at 10. New device at 9 (sizeU=1) should fit.
      mockInstalled([{ positionU: 10, sizeU: 1 }]);
      const result = await validateRackPlacement(
        placement({ positionU: 9, sizeU: 1 }),
      );
      expect(result).toEqual({ ok: true });
    });

    it("rejects when a multi-U placement straddles an existing device", async () => {
      mockRack(42);
      // Existing device occupies just slot 12.
      mockInstalled([{ positionU: 12, sizeU: 1 }]);
      // New 4U device at 10 would cover 10-13 — collides on slot 12.
      const result = await validateRackPlacement(
        placement({ positionU: 10, sizeU: 4 }),
      );
      expect(result.ok).toBe(false);
    });

    it("ignores installed devices with null positionU (unracked)", async () => {
      mockRack(42);
      mockInstalled([
        { positionU: null, sizeU: 2 },
        { positionU: null, sizeU: 1 },
      ]);
      const result = await validateRackPlacement(
        placement({ positionU: 1, sizeU: 4 }),
      );
      expect(result).toEqual({ ok: true });
    });

    it("detects collision against the third-from-the-top of an installed multi-U device", async () => {
      mockRack(42);
      // 4U device at 20 → occupies 20, 21, 22, 23.
      mockInstalled([{ positionU: 20, sizeU: 4 }]);
      // New 1U device at 23 collides.
      const result = await validateRackPlacement(
        placement({ positionU: 23, sizeU: 1 }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/Slot 23U/);
    });
  });

  describe("excludeDeviceId (move existing)", () => {
    it("excludes the named device id from the collision query", async () => {
      mockRack(42);
      mockInstalled([]);
      await validateRackPlacement(
        placement({ excludeDeviceId: "dev_42" }),
      );
      const findManyArgs = vi.mocked(mockTx.device.findMany).mock.calls[0]?.[0];
      expect(findManyArgs).toMatchObject({
        where: { id: { not: "dev_42" } },
      });
    });

    it("does NOT inject an exclusion clause when excludeDeviceId is omitted", async () => {
      mockRack(42);
      mockInstalled([]);
      await validateRackPlacement(placement());
      const findManyArgs = vi.mocked(mockTx.device.findMany).mock.calls[0]?.[0];
      // The where clause should not contain an `id` predicate at all.
      expect(findManyArgs?.where).not.toHaveProperty("id");
    });
  });
});
