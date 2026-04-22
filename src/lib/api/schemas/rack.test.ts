import { describe, expect, it } from "vitest";
import {
  rackResponseSchema,
  createRackBodySchema,
  updateRackBodySchema,
  listRacksResponseSchema,
} from "./rack";

describe("createRackBodySchema", () => {
  it("parses a minimal valid body", () => {
    const p = createRackBodySchema.parse({ name: "R1", sizeU: 42 });
    expect(p.name).toBe("R1");
  });
  it("rejects unknown fields (.strict())", () => {
    expect(() =>
      createRackBodySchema.parse({
        name: "R1",
        sizeU: 42,
        organizationId: "X",
      }),
    ).toThrow();
  });
  it("rejects sizeU > 60", () => {
    expect(() =>
      createRackBodySchema.parse({ name: "R1", sizeU: 100 }),
    ).toThrow();
  });
});

describe("rackResponseSchema", () => {
  it("strips unknown fields when parsing", () => {
    const row = {
      id: "r1",
      name: "R1",
      sizeU: 42,
      location: null,
      color: "blue",
      createdAt: new Date("2026-01-01"),
      userId: "LEAK",
      organizationId: "org1", // should be stripped
    };
    const parsed = rackResponseSchema.parse(row);
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("organizationId");
  });
});

describe("listRacksResponseSchema", () => {
  it("validates a full list response shape", () => {
    const parsed = listRacksResponseSchema.parse({
      racks: [
        {
          id: "r1",
          name: "R1",
          sizeU: 42,
          location: null,
          color: "blue",
          createdAt: new Date("2026-01-01"),
        },
      ],
      pagination: { total: 1, limit: 50, offset: 0, hasMore: false },
    });
    expect(parsed.racks).toHaveLength(1);
    expect(parsed.pagination.total).toBe(1);
  });
});

describe("updateRackBodySchema", () => {
  it("allows empty object (PATCH semantics)", () => {
    // Inherits .default(null) on location + .default("blue") on color via .partial().
    const p = updateRackBodySchema.parse({});
    expect(p.name).toBeUndefined();
    expect(p.sizeU).toBeUndefined();
  });
  it("still rejects unknown fields (.strict())", () => {
    expect(() =>
      updateRackBodySchema.parse({ name: "R1", userId: "LEAK" }),
    ).toThrow();
  });
});
