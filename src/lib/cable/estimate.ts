import {
  findLimit,
  STANDARD_PURCHASE_LENGTHS_M,
  type CableMediaType,
  type LinkSpeed,
} from "./limits";

const ONE_U_METERS = 0.044; // 1U slot ≈ 4.4 cm
const SLACK_PER_TERMINATION = 0.5; // m, both ends
const CABLE_MGMT_OVERHEAD = 1.5; // m

export type RackEndpoint = {
  rackId: string;
  positionU: number;
};

export type EstimateInput = {
  source?: RackEndpoint | null;
  target?: RackEndpoint | null;
  /** Direct length input (m) when one or both endpoints are unracked. */
  manualMeters?: number;
  /** Horizontal distance between racks (m). Default 0 — same rack. */
  rackSeparationMeters?: number;
  cableType: CableMediaType;
  linkSpeed: LinkSpeed;
};

export type EstimateResult = {
  rawMeters: number; // before snapping
  withOverageMeters: number; // raw × 1.25
  recommendedMeters: number; // snapped to standard purchase length
  status: "ok" | "warning" | "exceeded" | "speed_mismatch";
  limitMeters: number | null;
  notes: string[];
};

export function estimateCableLength(input: EstimateInput): EstimateResult {
  const notes: string[] = [];
  const limit = findLimit(input.cableType, input.linkSpeed);

  const rawMeters = computeRawMeters(input);
  const withOverage = rawMeters * 1.25;
  const recommendedMeters = snapUpToStandard(withOverage);

  if (!limit) {
    return {
      rawMeters,
      withOverageMeters: withOverage,
      recommendedMeters,
      status: "speed_mismatch",
      limitMeters: null,
      notes: [
        `${input.cableType} doesn't list a rated distance for ${input.linkSpeed}. Pick a higher-grade cable.`,
      ],
    };
  }

  let status: EstimateResult["status"] = "ok";
  if (rawMeters > limit.maxMeters) {
    status = "exceeded";
    notes.push(
      `${rawMeters.toFixed(1)} m exceeds the ${input.linkSpeed} limit on ${input.cableType} (${limit.maxMeters} m). Switch to a longer-reach cable type.`,
    );
  } else if (rawMeters >= limit.softMeters) {
    status = "warning";
    notes.push(
      `Within 15 % of the ${input.linkSpeed} reach limit on ${input.cableType}. Consider a higher-grade cable for headroom.`,
    );
  }

  return {
    rawMeters,
    withOverageMeters: withOverage,
    recommendedMeters,
    status,
    limitMeters: limit.maxMeters,
    notes,
  };
}

function computeRawMeters(input: EstimateInput): number {
  if (typeof input.manualMeters === "number" && input.manualMeters >= 0) {
    return input.manualMeters;
  }
  if (!input.source || !input.target) {
    return 0;
  }
  const verticalU = Math.abs(input.source.positionU - input.target.positionU);
  const sameRack = input.source.rackId === input.target.rackId;
  const horizontal = sameRack ? 0 : (input.rackSeparationMeters ?? 0);
  return (
    verticalU * ONE_U_METERS +
    horizontal +
    SLACK_PER_TERMINATION * 2 +
    CABLE_MGMT_OVERHEAD
  );
}

function snapUpToStandard(meters: number): number {
  if (meters <= 0) return STANDARD_PURCHASE_LENGTHS_M[0];
  for (const len of STANDARD_PURCHASE_LENGTHS_M) {
    if (len >= meters) return len;
  }
  // longer than the longest standard length — round up to the next 25m
  return Math.ceil(meters / 25) * 25;
}

export type BomLine = {
  cableType: CableMediaType;
  lengthMeters: number;
  count: number;
};

/**
 * Aggregate a list of estimates into a bill of materials grouped by
 * (cableType, recommendedMeters). For cable estimator UI.
 */
export function buildBom(
  estimates: ReadonlyArray<{
    cableType: CableMediaType;
    recommendedMeters: number;
  }>,
): BomLine[] {
  const map = new Map<string, BomLine>();
  for (const est of estimates) {
    const key = `${est.cableType}:${est.recommendedMeters}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        cableType: est.cableType,
        lengthMeters: est.recommendedMeters,
        count: 1,
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      a.cableType.localeCompare(b.cableType) || a.lengthMeters - b.lengthMeters,
  );
}
