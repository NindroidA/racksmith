import type { Snapshot } from "./snapshot";
import { ALL_RULES, buildRuleContext, type RuleFn } from "./rules";
import {
  dismissalKey,
  SEVERITY_RANK,
  type DismissalSet,
  type Recommendation,
} from "./types";

// Pure function: snapshot + dismissal lookup → recommendations, sorted
// critical → warning → info, then by ruleKey for stable ordering.
//
// `RuleContext` (adjacency Maps + per-id lookups) is built once and threaded
// to each rule, so the connections array is walked exactly once per
// evaluation regardless of how many rules read it.
export function evaluateRules(args: {
  snapshot: Snapshot;
  dismissals: DismissalSet;
  rules?: ReadonlyArray<RuleFn>;
}): Recommendation[] {
  const rules = args.rules ?? ALL_RULES;
  const ctx = buildRuleContext(args.snapshot);
  const out: Recommendation[] = [];
  for (const rule of rules) {
    for (const rec of rule(args.snapshot, ctx)) {
      if (args.dismissals.has(dismissalKey(rec.ruleKey, rec.entityKey))) {
        continue;
      }
      out.push(rec);
    }
  }
  out.sort((a, b) => {
    const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sev !== 0) return sev;
    return a.ruleKey.localeCompare(b.ruleKey);
  });
  return out;
}
