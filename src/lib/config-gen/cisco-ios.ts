import type { ConfigGenInput, ConfigGenOutput } from "./types";
import { compressRanges, groupByPort } from "./helpers";

export function generateCiscoIos(input: ConfigGenInput): ConfigGenOutput {
  const warnings: string[] = [];
  const lines: string[] = [];

  lines.push("!");
  lines.push(`! RackSmith — generated config for ${input.device.name}`);
  lines.push(`! Vendor: Cisco IOS`);
  lines.push(
    `! Review before applying. Never paste into a live session without a console connection available.`,
  );
  lines.push("!");
  lines.push("");

  // VLAN database (name + id).
  if (input.vlans.length > 0) {
    for (const v of input.vlans) {
      lines.push(`vlan ${v.vlanId}`);
      lines.push(` name ${safeName(v.name)}`);
      if (v.description) {
        lines.push(` ! ${oneLine(v.description)}`);
      }
      lines.push("!");
    }
    lines.push("");
  }

  // Group assignments per port.
  const byPort = groupByPort(input.assignments);
  const unportedTrunks = input.assignments
    .filter((a) => a.portNumber === null && (a.mode === "trunk" || a.tagged))
    .map((a) => a.vlanId);

  if (byPort.size === 0 && input.vlans.length === 0) {
    warnings.push(
      "No VLANs or port assignments — output only includes a header.",
    );
  }

  for (const [port, rows] of byPort) {
    const ifaceName = `GigabitEthernet0/${port}`;
    lines.push(`interface ${ifaceName}`);

    const hasTrunk = rows.some((r) => r.mode === "trunk");
    const accessRow = rows.find((r) => r.mode === "access");
    const nativeRow = rows.find((r) => r.mode === "native");

    if (hasTrunk) {
      lines.push(" switchport trunk encapsulation dot1q");
      lines.push(" switchport mode trunk");
      if (nativeRow) {
        lines.push(` switchport trunk native vlan ${nativeRow.vlanId}`);
      } else if (accessRow) {
        // Promote mixed access+trunk to native so voice-vlan / hybrid patterns
        // stay intact instead of silently dropping the access VLAN.
        lines.push(` switchport trunk native vlan ${accessRow.vlanId}`);
        warnings.push(
          `Port ${port}: mixed access+trunk — VLAN ${accessRow.vlanId} emitted as native. Review.`,
        );
      }
      const allowed = rows.map((r) => r.vlanId);
      lines.push(` switchport trunk allowed vlan ${compressVlanList(allowed)}`);
    } else if (accessRow) {
      lines.push(" switchport mode access");
      lines.push(` switchport access vlan ${accessRow.vlanId}`);
    } else {
      warnings.push(
        `Port ${port}: only native-tagged VLANs without trunk — skipped, review manually.`,
      );
    }
    lines.push("!");
  }

  if (unportedTrunks.length > 0) {
    warnings.push(
      `${unportedTrunks.length} device-level trunk assignment(s) without a port number — not emitted. Assign to specific ports for Cisco output.`,
    );
  }

  lines.push("end");

  return {
    vendor: "cisco-ios",
    text: lines.join("\n"),
    warnings,
  };
}

function safeName(s: string): string {
  // Cisco VLAN names: no spaces, alphanumeric + `_` + `-`. Safe substitution.
  return s.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
}

function oneLine(s: string): string {
  // Strip every Unicode control + format char. Terminals paste-translate
  // VT/FF/NEL/LS/PS back to LF, which would split a comment line and turn
  // the remainder into a live CLI command.
  return s.replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, " ").slice(0, 240);
}

// `groupByPort` and the run-compression helper now live in `./helpers.ts` so
// the same implementations are shared across the three vendors.
export const compressVlanList = (ids: number[]) => compressRanges(ids, "none");
