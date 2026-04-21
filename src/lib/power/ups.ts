// UPS runtime calculator. Supports two input modes: watt-hour spec sheets
// (preferred) and battery Ah / Voltage. Returns runtime in minutes. See
// research §1.3.

export type UpsInput =
  | {
      mode: "wh";
      batteryWh: number; // total battery capacity
      loadW: number; // current load
      usableDoD?: number; // 0–1, default 0.80
      derateForAge?: number; // 0–1, default 1.0 (no derate)
    }
  | {
      mode: "ah";
      batteryAh: number;
      batteryV: number;
      loadW: number;
      inverterEfficiency?: number; // 0–1, default 0.85
      usableDoD?: number;
      derateForAge?: number;
    };

export type UpsResult = {
  runtimeMinutes: number;
  effectiveWh: number;
  loadW: number;
  status: "ok" | "warning" | "critical";
  /** Floor in minutes used to grade the result. */
  targetMinutes: number;
};

export function calculateUpsRuntime(
  input: UpsInput,
  targetMinutes = 15,
): UpsResult {
  if (!Number.isFinite(input.loadW) || input.loadW < 0) {
    throw new Error("loadW must be a non-negative number");
  }
  if (input.loadW === 0) {
    throw new Error("loadW must be > 0 to compute runtime");
  }
  if (targetMinutes < 0 || !Number.isFinite(targetMinutes)) {
    throw new Error("targetMinutes must be a non-negative finite number");
  }

  // `??` (not `||`) so that an explicit 0 from the caller isn't silently
  // coerced to the default. Both Wh and Ah variants of UpsInput list these
  // fields as optional, so the discriminant doesn't matter here.
  const dod = clamp01(input.usableDoD ?? 0.8);
  const ageFactor = clamp01(input.derateForAge ?? 1.0);

  let nameplateWh: number;
  let efficiency = 1;
  if (input.mode === "wh") {
    nameplateWh = input.batteryWh;
  } else {
    if (input.batteryAh < 0 || input.batteryV < 0) {
      throw new Error("batteryAh and batteryV must be non-negative");
    }
    efficiency = clamp01(input.inverterEfficiency ?? 0.85);
    nameplateWh = input.batteryAh * input.batteryV;
  }

  const effectiveWh = nameplateWh * dod * ageFactor * efficiency;
  const runtimeHours = effectiveWh / input.loadW;
  const runtimeMinutes = runtimeHours * 60;

  let status: UpsResult["status"];
  if (runtimeMinutes < targetMinutes) status = "critical";
  else if (runtimeMinutes < targetMinutes * 1.25) status = "warning";
  else status = "ok";

  return {
    runtimeMinutes,
    effectiveWh,
    loadW: input.loadW,
    status,
    targetMinutes,
  };
}

/**
 * Build a runtime curve: stepped load from 10 % → 100 % of `peakLoadW`,
 * with the corresponding minutes. Used by the C6 Backup Power Planner
 * (Recharts <LineChart> data).
 *
 * Discriminated by `mode` so TypeScript narrows the spread shape correctly.
 */
type WhCurveInput = {
  mode: "wh";
  batteryWh: number;
  usableDoD?: number;
  derateForAge?: number;
};

type AhCurveInput = {
  mode: "ah";
  batteryAh: number;
  batteryV: number;
  inverterEfficiency?: number;
  usableDoD?: number;
  derateForAge?: number;
};

export type CurveInput = WhCurveInput | AhCurveInput;

export function buildRuntimeCurve(
  input: CurveInput,
  peakLoadW: number,
  steps = 10,
): Array<{ loadW: number; runtimeMinutes: number }> {
  if (peakLoadW <= 0) throw new Error("peakLoadW must be > 0");
  if (steps < 2) throw new Error("steps must be ≥ 2");
  const out: Array<{ loadW: number; runtimeMinutes: number }> = [];
  for (let i = 1; i <= steps; i++) {
    const loadW = (peakLoadW * i) / steps;
    const point: UpsInput =
      input.mode === "wh" ? { ...input, loadW } : { ...input, loadW };
    const runtime = calculateUpsRuntime(point, 0);
    out.push({ loadW, runtimeMinutes: runtime.runtimeMinutes });
  }
  return out;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
