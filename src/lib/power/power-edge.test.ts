import { describe, expect, it } from "vitest";
import { calculatePduCapacity } from "./pdu";
import { buildRuntimeCurve, calculateUpsRuntime } from "./ups";

// Edge / branch coverage for pdu.ts + ups.ts. Happy paths live in
// power.test.ts; these tests hit the validation throws, status-grade
// boundaries, and the optional derate/efficiency/age factors that the
// happy-path suite never exercises.

describe("calculatePduCapacity — input validation", () => {
  it("rejects NaN amps (line 34)", () => {
    expect(() =>
      calculatePduCapacity({ amps: Number.NaN, volts: 120 }, 100),
    ).toThrow("amps must be a non-negative number");
  });

  it("rejects negative amps (line 34)", () => {
    expect(() =>
      calculatePduCapacity({ amps: -5, volts: 120 }, 100),
    ).toThrow("amps must be a non-negative number");
  });

  it("rejects Infinity amps (line 34)", () => {
    expect(() =>
      calculatePduCapacity({ amps: Number.POSITIVE_INFINITY, volts: 120 }, 100),
    ).toThrow("amps must be a non-negative number");
  });

  it("rejects NaN volts (line 36)", () => {
    expect(() =>
      calculatePduCapacity({ amps: 20, volts: Number.NaN }, 100),
    ).toThrow("volts must be a non-negative number");
  });

  it("rejects negative volts (line 36)", () => {
    expect(() =>
      calculatePduCapacity({ amps: 20, volts: -120 }, 100),
    ).toThrow("volts must be a non-negative number");
  });

  it("rejects NaN loadWatts (line 38)", () => {
    expect(() =>
      calculatePduCapacity({ amps: 20, volts: 120 }, Number.NaN),
    ).toThrow("loadWatts must be a non-negative number");
  });

  it("rejects negative loadWatts (line 38)", () => {
    expect(() =>
      calculatePduCapacity({ amps: 20, volts: 120 }, -50),
    ).toThrow("loadWatts must be a non-negative number");
  });

  it("rejects derate of 0 (line 42)", () => {
    expect(() =>
      calculatePduCapacity(
        { amps: 20, volts: 120, continuousDerate: 0 },
        100,
      ),
    ).toThrow("continuousDerate must be in (0, 1]");
  });

  it("rejects negative derate (line 42)", () => {
    expect(() =>
      calculatePduCapacity(
        { amps: 20, volts: 120, continuousDerate: -0.1 },
        100,
      ),
    ).toThrow("continuousDerate must be in (0, 1]");
  });

  it("rejects derate above 1 (line 42)", () => {
    expect(() =>
      calculatePduCapacity(
        { amps: 20, volts: 120, continuousDerate: 1.01 },
        100,
      ),
    ).toThrow("continuousDerate must be in (0, 1]");
  });
});

describe("calculatePduCapacity — status grading + factors", () => {
  it("flags ok when load is below 70% of continuous capacity (line 54)", () => {
    // 20A × 120V = 2400 raw; × 0.80 = 1920 continuous.
    // 70% of 1920 = 1344. Load of 1000 < 1344 → ok.
    const r = calculatePduCapacity({ amps: 20, volts: 120 }, 1000);
    expect(r.rawCapacity).toBe(2400);
    expect(r.continuousCapacity).toBe(1920);
    expect(r.status).toBe("ok");
    expect(r.pctOfContinuous).toBeCloseTo(1000 / 1920, 6);
    expect(r.remaining).toBe(920);
  });

  it("uses a custom derate when supplied", () => {
    // derate 0.5 → continuous = 2400 × 0.5 = 1200. 70% = 840.
    // Load 500 < 840 → ok.
    const r = calculatePduCapacity(
      { amps: 20, volts: 120, continuousDerate: 0.5 },
      500,
    );
    expect(r.continuousCapacity).toBe(1200);
    expect(r.status).toBe("ok");
    expect(r.remaining).toBe(700);
  });

  it("accepts derate of exactly 1 (upper boundary of (0,1])", () => {
    // derate 1 → continuous == raw = 2400. 70% = 1680.
    // Load 1680 sits exactly at the warning threshold → warning.
    const r = calculatePduCapacity(
      { amps: 20, volts: 120, continuousDerate: 1 },
      1680,
    );
    expect(r.continuousCapacity).toBe(2400);
    expect(r.status).toBe("warning");
  });

  it("reports zero pctOfContinuous when capacity is zero", () => {
    // amps 0 → rawCapacity 0 → continuousCapacity 0. Guard returns 0 pct.
    const r = calculatePduCapacity({ amps: 0, volts: 120 }, 0);
    expect(r.rawCapacity).toBe(0);
    expect(r.continuousCapacity).toBe(0);
    expect(r.pctOfContinuous).toBe(0);
    // loadWatts 0 is not > raw(0), not >= continuous(0)... 0 >= 0 → critical.
    expect(r.status).toBe("critical");
  });
});

describe("calculateUpsRuntime — input validation", () => {
  it("rejects NaN loadW (line 37)", () => {
    expect(() =>
      calculateUpsRuntime({ mode: "wh", batteryWh: 1000, loadW: Number.NaN }),
    ).toThrow("loadW must be a non-negative number");
  });

  it("rejects negative loadW (line 37)", () => {
    expect(() =>
      calculateUpsRuntime({ mode: "wh", batteryWh: 1000, loadW: -100 }),
    ).toThrow("loadW must be a non-negative number");
  });

  it("rejects negative targetMinutes (line 43)", () => {
    expect(() =>
      calculateUpsRuntime(
        { mode: "wh", batteryWh: 1000, loadW: 200 },
        -1,
      ),
    ).toThrow("targetMinutes must be a non-negative finite number");
  });

  it("rejects non-finite targetMinutes (line 43)", () => {
    expect(() =>
      calculateUpsRuntime(
        { mode: "wh", batteryWh: 1000, loadW: 200 },
        Number.POSITIVE_INFINITY,
      ),
    ).toThrow("targetMinutes must be a non-negative finite number");
  });

  it("rejects negative batteryAh in ah mode (line 58)", () => {
    expect(() =>
      calculateUpsRuntime({
        mode: "ah",
        batteryAh: -100,
        batteryV: 24,
        loadW: 200,
      }),
    ).toThrow("batteryAh and batteryV must be non-negative");
  });

  it("rejects negative batteryV in ah mode (line 58)", () => {
    expect(() =>
      calculateUpsRuntime({
        mode: "ah",
        batteryAh: 100,
        batteryV: -24,
        loadW: 200,
      }),
    ).toThrow("batteryAh and batteryV must be non-negative");
  });
});

describe("calculateUpsRuntime — status grading + factors", () => {
  it("flags warning between target and 1.25× target", () => {
    // 1000 Wh × 0.8 DoD ÷ 200 W = 4 hr = 240 min.
    // target 200 → 1.25× = 250. 240 is in [200, 250) → warning.
    const r = calculateUpsRuntime(
      { mode: "wh", batteryWh: 1000, loadW: 200 },
      200,
    );
    expect(r.runtimeMinutes).toBeCloseTo(240, 6);
    expect(r.status).toBe("warning");
  });

  it("applies usableDoD and derateForAge overrides", () => {
    // 1000 Wh × 0.5 DoD × 0.9 age = 450 effective Wh.
    // ÷ 100 W = 4.5 hr = 270 min.
    const r = calculateUpsRuntime({
      mode: "wh",
      batteryWh: 1000,
      loadW: 100,
      usableDoD: 0.5,
      derateForAge: 0.9,
    });
    expect(r.effectiveWh).toBeCloseTo(450, 6);
    expect(r.runtimeMinutes).toBeCloseTo(270, 6);
    expect(r.status).toBe("ok");
  });

  it("honors an explicit usableDoD of 0 (?? not || coercion)", () => {
    // DoD 0 → effectiveWh 0 → runtime 0 → critical (0 < target 15).
    const r = calculateUpsRuntime({
      mode: "wh",
      batteryWh: 1000,
      loadW: 200,
      usableDoD: 0,
    });
    expect(r.effectiveWh).toBe(0);
    expect(r.runtimeMinutes).toBe(0);
    expect(r.status).toBe("critical");
  });

  it("clamps an out-of-range DoD above 1 down to 1", () => {
    // DoD clamped 1.5 → 1.0. 1000 Wh × 1 ÷ 200 W = 5 hr = 300 min.
    const r = calculateUpsRuntime({
      mode: "wh",
      batteryWh: 1000,
      loadW: 200,
      usableDoD: 1.5,
    });
    expect(r.effectiveWh).toBe(1000);
    expect(r.runtimeMinutes).toBeCloseTo(300, 6);
  });

  it("applies a custom inverterEfficiency in ah mode", () => {
    // 100 Ah × 24 V = 2400 Wh nameplate × 0.8 DoD × 1.0 age × 0.5 eff = 960 Wh.
    // ÷ 200 W = 4.8 hr = 288 min.
    const r = calculateUpsRuntime({
      mode: "ah",
      batteryAh: 100,
      batteryV: 24,
      loadW: 200,
      inverterEfficiency: 0.5,
    });
    expect(r.effectiveWh).toBeCloseTo(960, 6);
    expect(r.runtimeMinutes).toBeCloseTo(288, 6);
  });

  it("accepts batteryAh and batteryV of exactly 0 (non-negative boundary)", () => {
    // 0 nameplate Wh → 0 effective → 0 runtime → critical.
    const r = calculateUpsRuntime({
      mode: "ah",
      batteryAh: 0,
      batteryV: 0,
      loadW: 200,
    });
    expect(r.effectiveWh).toBe(0);
    expect(r.runtimeMinutes).toBe(0);
    expect(r.status).toBe("critical");
  });
});

describe("buildRuntimeCurve — guards + ah branch", () => {
  it("rejects non-positive peakLoadW", () => {
    expect(() =>
      buildRuntimeCurve({ mode: "wh", batteryWh: 1000 }, 0),
    ).toThrow("peakLoadW must be > 0");
  });

  it("rejects fewer than 2 steps", () => {
    expect(() =>
      buildRuntimeCurve({ mode: "wh", batteryWh: 1000 }, 1000, 1),
    ).toThrow("steps must be ≥ 2");
  });

  it("builds an ah-mode curve with decreasing runtime as load climbs", () => {
    // 100 Ah × 24 V × 0.8 DoD × 0.85 eff = 1632 effective Wh.
    // step 1 of 4: load = 250 W → 1632/250 hr × 60 = 391.68 min.
    // step 4 of 4: load = 1000 W → 1632/1000 hr × 60 = 97.92 min.
    const curve = buildRuntimeCurve(
      { mode: "ah", batteryAh: 100, batteryV: 24 },
      1000,
      4,
    );
    expect(curve).toHaveLength(4);
    expect(curve[0].loadW).toBe(250);
    expect(curve[0].runtimeMinutes).toBeCloseTo(391.68, 2);
    expect(curve[3].loadW).toBe(1000);
    expect(curve[3].runtimeMinutes).toBeCloseTo(97.92, 2);
    expect(curve[0].runtimeMinutes).toBeGreaterThan(curve[3].runtimeMinutes);
  });
});
