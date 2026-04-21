// Severity drives color, copy tier, and whether the alert bubbles to a
// dashboard toast. See research-recommendations-engine.md §2.2.
export type Severity = "critical" | "warning" | "info";

// Each rule emits zero-or-more Recommendations. `ruleKey` + `entityKey`
// jointly identify a recommendation for dismissal/snooze persistence.
export type Recommendation = {
  ruleKey: string; // namespaced, e.g. "rack:fill"
  entityKey: string; // composite, e.g. "rack:cl12345abc"
  severity: Severity;
  title: string; // 1-line headline (≤ 80 chars)
  detail: string; // longer explanation (1-3 sentences)
  resource?: {
    // optional deep-link to the affected resource
    type: "rack" | "device" | "subnet" | "vlan" | "dhcp_range";
    id: string;
    label?: string;
  };
};

// Aggregated dismissal lookup. Set membership is `${ruleKey}::${entityKey}`.
export type DismissalSet = ReadonlySet<string>;

export function dismissalKey(ruleKey: string, entityKey: string): string {
  return `${ruleKey}::${entityKey}`;
}

// Persistent dismissal row (display side — different from the membership Set
// above). The recommendations page uses this to render the "Dismissed"
// sidebar without firing a second DB query.
export type DismissalRecord = {
  ruleKey: string;
  entityKey: string;
  expiresAt: Date | null;
  dismissedAt: Date;
};

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// Group recommendations by severity, preserving rule order within a bucket.
export function bySeverity(
  recs: ReadonlyArray<Recommendation>,
): Record<Severity, Recommendation[]> {
  const out: Record<Severity, Recommendation[]> = {
    critical: [],
    warning: [],
    info: [],
  };
  for (const r of recs) out[r.severity].push(r);
  return out;
}
