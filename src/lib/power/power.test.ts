import { describe, expect, it } from "vitest";
import { calculatePoeBudget } from "./poe";
import { calculatePduCapacity } from "./pdu";
import { buildRuntimeCurve, calculateUpsRuntime } from "./ups";

describe("calculatePoeBudget", () => {
  it("flags ok when total draw is well under budget", () => {
    const r = calculatePoeBudget(370, [
      { label: "AP", count: 5, wattsEach: 20 },
    ]);
    expect(r.status).toBe("ok");
    expect(r.totalDraw).toBe(100);
  });

  it("warns at 80 % of budget", () => {
    const r = calculatePoeBudget(100, [
      { label: "AP", count: 5, wattsEach: 16 },
    ]);
    expect(r.status).toBe("warning");
    expect(r.totalDraw).toBe(80);
  });

  it("flags critical when over the headroom-adjusted budget", () => {
    const r = calculatePoeBudget(100, [
      { label: "AP", count: 1, wattsEach: 90 },
    ]);
    expect(r.status).toBe("critical");
  });

  it("flags exceeded when over the raw budget", () => {
    const r = calculatePoeBudget(100, [
      { label: "AP", count: 1, wattsEach: 110 },
    ]);
    expect(r.status).toBe("exceeded");
  });

  it("respects custom headroom factor", () => {
    // 0 headroom → effective budget == raw budget
    const r = calculatePoeBudget(100, [
      { label: "AP", count: 1, wattsEach: 99 },
    ], 0);
    expect(r.effectiveBudget).toBe(100);
    expect(r.status).toBe("warning");
  });

  it("rejects out-of-range headroom factor", () => {
    expect(() =>
      calculatePoeBudget(100, [], 1),
    ).toThrow();
    expect(() =>
      calculatePoeBudget(100, [], -0.1),
    ).toThrow();
  });
});

describe("calculatePduCapacity", () => {
  it("computes raw + continuous capacity for a 20A/120V circuit", () => {
    const r = calculatePduCapacity({ amps: 20, volts: 120 }, 1500);
    expect(r.rawCapacity).toBe(2400);
    expect(r.continuousCapacity).toBe(1920);
    expect(r.status).toBe("warning"); // 1500 ≥ 70 % of 1920
  });

  it("flags critical at the continuous cap", () => {
    const r = calculatePduCapacity({ amps: 20, volts: 120 }, 1920);
    expect(r.status).toBe("critical");
  });

  it("flags exceeded when over the breaker rating", () => {
    const r = calculatePduCapacity({ amps: 20, volts: 120 }, 2500);
    expect(r.status).toBe("exceeded");
  });
});

describe("calculateUpsRuntime — wh mode", () => {
  it("returns minutes proportional to capacity ÷ load", () => {
    // 1000 Wh × 0.8 DoD ÷ 200 W = 4 hr = 240 min
    const r = calculateUpsRuntime({ mode: "wh", batteryWh: 1000, loadW: 200 });
    expect(r.runtimeMinutes).toBeCloseTo(240, 1);
    expect(r.status).toBe("ok");
  });

  it("flags critical under target", () => {
    // 100 Wh × 0.8 ÷ 800 W = 0.1 hr = 6 min, target 15
    const r = calculateUpsRuntime(
      { mode: "wh", batteryWh: 100, loadW: 800 },
      15,
    );
    expect(r.status).toBe("critical");
  });

  it("rejects zero load", () => {
    expect(() =>
      calculateUpsRuntime({ mode: "wh", batteryWh: 100, loadW: 0 }),
    ).toThrow();
  });
});

describe("calculateUpsRuntime — ah mode", () => {
  it("multiplies Ah × V × efficiency × DoD", () => {
    // 100 Ah × 24 V = 2400 Wh nameplate × 0.85 efficiency × 0.80 DoD = 1632 Wh
    // / 200 W load = 8.16 hr = ~489.6 min
    const r = calculateUpsRuntime({
      mode: "ah",
      batteryAh: 100,
      batteryV: 24,
      loadW: 200,
    });
    expect(r.runtimeMinutes).toBeCloseTo(489.6, 1);
  });
});

describe("buildRuntimeCurve", () => {
  it("generates `steps` increasing-load samples", () => {
    const curve = buildRuntimeCurve(
      { mode: "wh", batteryWh: 1000 },
      1000,
      5,
    );
    expect(curve).toHaveLength(5);
    expect(curve[0].loadW).toBe(200);
    expect(curve[4].loadW).toBe(1000);
    // Higher load → lower runtime
    expect(curve[0].runtimeMinutes).toBeGreaterThan(curve[4].runtimeMinutes);
  });
});
