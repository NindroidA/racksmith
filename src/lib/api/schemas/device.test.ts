import { describe, expect, it } from "vitest";
import {
  createDeviceBodySchema,
  deviceResponseSchema,
  listDevicesQuerySchema,
  listDevicesResponseSchema,
  updateDeviceBodySchema,
} from "./device";

describe("createDeviceBodySchema", () => {
  it("parses a minimal device", () => {
    const p = createDeviceBodySchema.parse({
      name: "sw1",
      deviceType: "switch",
      sizeU: 1,
      portCount: 24,
    });
    expect(p.name).toBe("sw1");
  });

  it("rejects unknown fields", () => {
    expect(() =>
      createDeviceBodySchema.parse({
        name: "sw1",
        deviceType: "switch",
        sizeU: 1,
        portCount: 24,
        organizationId: "X",
      }),
    ).toThrow();
  });

  it("rejects invalid deviceType", () => {
    expect(() =>
      createDeviceBodySchema.parse({
        name: "sw1",
        deviceType: "laser-printer",
        sizeU: 1,
        portCount: 24,
      }),
    ).toThrow();
  });

  it("rejects sizeU > 20", () => {
    expect(() =>
      createDeviceBodySchema.parse({
        name: "sw1",
        deviceType: "switch",
        sizeU: 100,
        portCount: 24,
      }),
    ).toThrow();
  });

  it("rejects control characters in name", () => {
    expect(() =>
      createDeviceBodySchema.parse({
        name: "sw1\nnowrite terminal",
        deviceType: "switch",
        sizeU: 1,
        portCount: 24,
      }),
    ).toThrow();
  });
});

describe("deviceResponseSchema", () => {
  it("strips userId / organizationId", () => {
    const row = {
      id: "d1",
      name: "sw1",
      deviceType: "switch",
      manufacturer: "",
      model: "",
      sizeU: 1,
      portCount: 24,
      powerWatts: null,
      rackId: null,
      positionU: null,
      ipAddress: null,
      macAddress: null,
      hostname: null,
      createdAt: new Date(),
      userId: "LEAK",
      organizationId: "LEAK",
    };
    const parsed = deviceResponseSchema.parse(row);
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("organizationId");
  });
});

describe("updateDeviceBodySchema", () => {
  it("allows empty object (PATCH semantics)", () => {
    const p = updateDeviceBodySchema.parse({});
    expect(p.name).toBeUndefined();
  });

  it("still rejects unknown fields (.strict())", () => {
    expect(() =>
      updateDeviceBodySchema.parse({ name: "sw1", userId: "LEAK" }),
    ).toThrow();
  });
});

describe("listDevicesQuerySchema", () => {
  it("coerces string query values to numbers", () => {
    const p = listDevicesQuerySchema.parse({ limit: "10", offset: "20" });
    expect(p.limit).toBe(10);
    expect(p.offset).toBe(20);
  });

  it("applies defaults when omitted", () => {
    const p = listDevicesQuerySchema.parse({});
    expect(p.limit).toBe(50);
    expect(p.offset).toBe(0);
  });

  it("rejects unknown fields (.strict())", () => {
    expect(() =>
      listDevicesQuerySchema.parse({ organizationId: "X" }),
    ).toThrow();
  });
});

describe("listDevicesResponseSchema", () => {
  it("validates a full list response shape", () => {
    const parsed = listDevicesResponseSchema.parse({
      devices: [
        {
          id: "d1",
          name: "sw1",
          deviceType: "switch",
          manufacturer: "",
          model: "",
          sizeU: 1,
          portCount: 24,
          powerWatts: null,
          rackId: null,
          positionU: null,
          ipAddress: null,
          macAddress: null,
          hostname: null,
          createdAt: new Date("2026-01-01"),
        },
      ],
      pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
    });
    expect(parsed.devices).toHaveLength(1);
    expect(parsed.pagination.total).toBe(1);
  });
});
