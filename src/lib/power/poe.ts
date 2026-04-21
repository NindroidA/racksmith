// PoE budget calculator. Sums per-device draw against a switch's documented
// budget, with a 10 % default headroom factor (safe rule of thumb so transient
// peaks don't trip the budget). See research-recommendations-engine.md §1.1.

export type PoeStandard = "af" | "at" | "bt-type3" | "bt-type4";

export type PoeDeviceLine = {
  label: string;
  count: number;
  wattsEach: number;
};

export type PoeBudgetResult = {
  totalDraw: number;
  budget: number;
  headroomFactor: number;
  effectiveBudget: number;
  pctOfBudget: number;
  status: "ok" | "warning" | "critical" | "exceeded";
  remaining: number;
};

/**
 * Compute the PoE picture for one switch.
 *
 * `headroomFactor` defaults to 0.10 — i.e. only allow 90 % of the rated
 * budget for steady draw, leaving 10 % for spikes. Surface the toggle in
 * the AdvancedAccordion so power-user homelabbers can crank it to 0.
 */
export function calculatePoeBudget(
  budget: number,
  lines: ReadonlyArray<PoeDeviceLine>,
  headroomFactor = 0.1,
): PoeBudgetResult {
  if (!Number.isFinite(budget) || budget < 0) {
    throw new Error("budget must be a non-negative number");
  }
  if (headroomFactor < 0 || headroomFactor >= 1) {
    throw new Error("headroomFactor must be in [0, 1)");
  }

  const totalDraw = lines.reduce(
    (sum, line) => sum + Math.max(0, line.count) * Math.max(0, line.wattsEach),
    0,
  );
  const effectiveBudget = budget * (1 - headroomFactor);
  const pctOfBudget = budget === 0 ? 0 : totalDraw / budget;
  const remaining = effectiveBudget - totalDraw;

  let status: PoeBudgetResult["status"];
  if (totalDraw > budget) status = "exceeded";
  else if (totalDraw >= effectiveBudget) status = "critical";
  else if (totalDraw >= 0.8 * budget) status = "warning";
  else status = "ok";

  return {
    totalDraw,
    budget,
    headroomFactor,
    effectiveBudget,
    pctOfBudget,
    status,
    remaining,
  };
}
