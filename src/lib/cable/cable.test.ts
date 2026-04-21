import { describe, expect, it } from "vitest";
import { buildBom, estimateCableLength } from "./estimate";
import { findLimit } from "./limits";

describe("findLimit", () => {
  it("returns the matching speed entry", () => {
    const lim = findLimit("cat6", "10G");
    expect(lim?.maxMeters).toBe(33);
    expect(lim?.softMeters).toBeGreaterThan(0);
  });

  it("returns undefined for an unsupported speed", () => {
    expect(findLimit("cat5e", "10G")).toBeUndefined();
  });
});

describe("estimateCableLength", () => {
  it("computes from rack positions in the same rack", () => {
    const r = estimateCableLength({
      source: { rackId: "r1", positionU: 1 },
      target: { rackId: "r1", positionU: 24 },
      cableType: "cat6a",
      linkSpeed: "10G",
    });
    // 23U × 0.044 + 1.0 (slack) + 1.5 (mgmt) ≈ 3.512
    expect(r.rawMeters).toBeCloseTo(3.512, 2);
    expect(r.status).toBe("ok");
    expect(r.recommendedMeters).toBe(5);
  });

  it("adds horizontal separation across racks", () => {
    const r = estimateCableLength({
      source: { rackId: "r1", positionU: 1 },
      target: { rackId: "r2", positionU: 1 },
      rackSeparationMeters: 3,
      cableType: "cat6a",
      linkSpeed: "1G",
    });
    expect(r.rawMeters).toBeCloseTo(0 + 3 + 1 + 1.5, 2);
  });

  it("uses manualMeters when one endpoint is unracked", () => {
    const r = estimateCableLength({
      manualMeters: 50,
      cableType: "cat5e",
      linkSpeed: "1G",
    });
    expect(r.rawMeters).toBe(50);
    expect(r.status).toBe("ok");
  });

  it("warns when within 15 % of the rated max", () => {
    const r = estimateCableLength({
      manualMeters: 90,
      cableType: "cat5e",
      linkSpeed: "1G",
    });
    expect(r.status).toBe("warning");
  });

  it("flags exceeded over the rated max", () => {
    const r = estimateCableLength({
      manualMeters: 120,
      cableType: "cat5e",
      linkSpeed: "1G",
    });
    expect(r.status).toBe("exceeded");
  });

  it("flags speed_mismatch when the cable doesn't carry that speed", () => {
    const r = estimateCableLength({
      manualMeters: 5,
      cableType: "cat5e",
      linkSpeed: "10G",
    });
    expect(r.status).toBe("speed_mismatch");
  });

  it("snaps to the next standard length", () => {
    const r = estimateCableLength({
      manualMeters: 4,
      cableType: "cat6",
      linkSpeed: "1G",
    });
    // 4 × 1.25 = 5.0 — exactly meets the 5 m standard length
    expect(r.recommendedMeters).toBe(5);
  });

  it("rounds up past the next standard length when overage pushes over", () => {
    const r = estimateCableLength({
      manualMeters: 4.5,
      cableType: "cat6",
      linkSpeed: "1G",
    });
    // 4.5 × 1.25 = 5.625 — needs the 7 m standard length
    expect(r.recommendedMeters).toBe(7);
  });
});

describe("buildBom", () => {
  it("aggregates by (cableType, length)", () => {
    const bom = buildBom([
      { cableType: "cat6a", recommendedMeters: 5 },
      { cableType: "cat6a", recommendedMeters: 5 },
      { cableType: "cat6a", recommendedMeters: 10 },
      { cableType: "om4", recommendedMeters: 25 },
    ]);
    expect(bom).toEqual([
      { cableType: "cat6a", lengthMeters: 5, count: 2 },
      { cableType: "cat6a", lengthMeters: 10, count: 1 },
      { cableType: "om4", lengthMeters: 25, count: 1 },
    ]);
  });
});
