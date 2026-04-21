// PDU sizing calculator. Implements the NEC continuous-load rule: a circuit
// drawing for ≥ 3 hours must be loaded to ≤ 80 % of breaker rating. See
// research §1.2.

export type PduCircuit = {
  amps: number;
  volts: number;
  /** Continuous-use derate. NEC default = 0.80. */
  continuousDerate?: number;
};

export type PduCalculation = {
  rawCapacity: number;       // amps × volts
  continuousCapacity: number; // rawCapacity × derate
  loadWatts: number;
  pctOfContinuous: number;
  status: "ok" | "warning" | "critical" | "exceeded";
  remaining: number;
};

export const COMMON_PDU_CIRCUITS = [
  { label: "15A / 120V", amps: 15, volts: 120 },
  { label: "20A / 120V", amps: 20, volts: 120 },
  { label: "30A / 208V", amps: 30, volts: 208 },
  { label: "30A / 240V", amps: 30, volts: 240 },
  { label: "50A / 240V", amps: 50, volts: 240 },
] as const;

export function calculatePduCapacity(
  circuit: PduCircuit,
  loadWatts: number,
): PduCalculation {
  if (!Number.isFinite(circuit.amps) || circuit.amps < 0)
    throw new Error("amps must be a non-negative number");
  if (!Number.isFinite(circuit.volts) || circuit.volts < 0)
    throw new Error("volts must be a non-negative number");
  if (!Number.isFinite(loadWatts) || loadWatts < 0)
    throw new Error("loadWatts must be a non-negative number");

  const derate = circuit.continuousDerate ?? 0.80;
  if (derate <= 0 || derate > 1) {
    throw new Error("continuousDerate must be in (0, 1]");
  }

  const rawCapacity = circuit.amps * circuit.volts;
  const continuousCapacity = rawCapacity * derate;
  const pctOfContinuous =
    continuousCapacity === 0 ? 0 : loadWatts / continuousCapacity;

  let status: PduCalculation["status"];
  if (loadWatts > rawCapacity) status = "exceeded";
  else if (loadWatts >= continuousCapacity) status = "critical";
  else if (loadWatts >= 0.70 * continuousCapacity) status = "warning";
  else status = "ok";

  return {
    rawCapacity,
    continuousCapacity,
    loadWatts,
    pctOfContinuous,
    status,
    remaining: continuousCapacity - loadWatts,
  };
}
