import type { ConfigGenInput } from "./types";

/**
 * Group VLAN assignments by port number, dropping any assignment without a
 * port. Returns a Map sorted by port number ascending. Shared between Cisco
 * IOS and UniFi config generators (HPE generates from a different shape).
 */
export function groupByPort(
  assignments: ConfigGenInput["assignments"],
): Map<number, ConfigGenInput["assignments"]> {
  const map = new Map<number, ConfigGenInput["assignments"]>();
  for (const a of assignments) {
    if (a.portNumber === null) continue;
    const list = map.get(a.portNumber) ?? [];
    list.push(a);
    map.set(a.portNumber, list);
  }
  return new Map(Array.from(map.entries()).sort((a, b) => a[0] - b[0]));
}

/**
 * Run-length compression of a sorted unique number list into a CLI-style
 * range string (e.g. `[10, 20, 21, 22, 30]` → `"10,20-22,30"`).
 *
 * `emptyToken` controls the empty-input return value — Cisco wants `"none"`
 * (so `vlan trunk allowed vlan none` is valid), HPE wants `""` (the empty
 * port-list is just no ports).
 */
export function compressRanges(nums: number[], emptyToken: string): string {
  const sorted = Array.from(new Set(nums)).sort((a, b) => a - b);
  if (sorted.length === 0) return emptyToken;
  const parts: string[] = [];
  let runStart = sorted[0];
  let runEnd = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (n === runEnd + 1) {
      runEnd = n;
      continue;
    }
    parts.push(runStart === runEnd ? `${runStart}` : `${runStart}-${runEnd}`);
    runStart = n;
    runEnd = n;
  }
  parts.push(runStart === runEnd ? `${runStart}` : `${runStart}-${runEnd}`);
  return parts.join(",");
}
