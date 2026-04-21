import type { ConfigGenInput, ConfigGenOutput } from "./types";
import { compressRanges } from "./helpers";

export function generateHpeAruba(input: ConfigGenInput): ConfigGenOutput {
  const warnings: string[] = [];
  const lines: string[] = [];

  lines.push("; RackSmith — generated config for " + input.device.name);
  lines.push("; Vendor: HPE Aruba ProVision (ProCurve)");
  lines.push(
    "; Review before applying. VLAN context owns its port memberships — very different from Cisco.",
  );
  lines.push("");

  // HPE model: VLAN context `vlan N` → untagged + tagged port lists.
  // A port may be untagged on ONE vlan (access) and tagged on many (trunk
  // participation).
  for (const v of input.vlans) {
    const matches = input.assignments.filter((a) => a.vlanId === v.vlanId);
    const untagged = matches
      .filter(
        (a) =>
          a.portNumber !== null && (a.mode === "access" || a.mode === "native"),
      )
      .map((a) => a.portNumber as number);
    const tagged = matches
      .filter((a) => a.portNumber !== null && a.mode === "trunk")
      .map((a) => a.portNumber as number);

    lines.push(`vlan ${v.vlanId}`);
    lines.push(`   name "${safeName(v.name)}"`);
    if (untagged.length > 0) {
      lines.push(`   untagged ${compressPortList(untagged)}`);
    }
    if (tagged.length > 0) {
      lines.push(`   tagged ${compressPortList(tagged)}`);
    }
    if (untagged.length === 0 && tagged.length === 0) {
      lines.push(
        "   ; no port assignments — VLAN exists but unused on this device",
      );
    }
    lines.push("   exit");
    lines.push("");
  }

  const unportedCount = input.assignments.filter(
    (a) => a.portNumber === null,
  ).length;
  if (unportedCount > 0) {
    warnings.push(
      `${unportedCount} device-level assignment(s) without a port — HPE CLI requires explicit ports. Skipped.`,
    );
  }

  // Detect a per-port conflict: port can't be untagged on >1 VLAN.
  const perPortUntagged = new Map<number, number[]>();
  for (const a of input.assignments) {
    if (a.portNumber === null) continue;
    if (a.mode !== "access" && a.mode !== "native") continue;
    const list = perPortUntagged.get(a.portNumber) ?? [];
    list.push(a.vlanId);
    perPortUntagged.set(a.portNumber, list);
  }
  for (const [port, vlans] of perPortUntagged) {
    if (vlans.length > 1) {
      warnings.push(
        `Port ${port} is untagged on multiple VLANs (${vlans.join(", ")}) — HPE allows only one untagged VLAN per port. Fix before applying.`,
      );
    }
  }

  return {
    vendor: "hpe-aruba",
    text: lines.join("\n"),
    warnings,
  };
}

function safeName(s: string): string {
  // HPE VLAN names accept spaces but must drop control + format chars (VT,
  // FF, NEL, LS, PS all paste-translate to LF in most terminals) + the quote
  // char (which breaks the CLI's quoted-string parser).
  return s.replace(/[\p{Cc}\p{Cf}\u2028\u2029"]/gu, "").slice(0, 32);
}

// `compressPortList` is the shared `compressRanges` with the empty token
// HPE expects (no `none` keyword in the port-list grammar).
export const compressPortList = (ports: number[]) => compressRanges(ports, "");
