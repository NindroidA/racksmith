import type { ConfigGenInput, ConfigGenOutput } from "./types";
import { groupByPort } from "./helpers";

type UnifiNetwork = {
  name: string;
  vlan: number;
  purpose: string;
  enabled: true;
};

type UnifiPortOverride = {
  port_idx: number;
  op_mode: "switch";
  portconf_name: string;
  name: string;
  native_vlan?: number;
  tagged_vlans?: number[];
};

const PURPOSE_MAP: Record<string, string> = {
  user: "corporate",
  management: "corporate",
  iot: "guest",
  guest: "guest",
  voip: "vlan-only",
  storage: "vlan-only",
  other: "vlan-only",
};

export function generateUnifi(input: ConfigGenInput): ConfigGenOutput {
  const warnings: string[] = [];

  const networks: UnifiNetwork[] = input.vlans.map((v) => ({
    name: safeName(v.name),
    vlan: v.vlanId,
    purpose: PURPOSE_MAP[v.purpose] ?? "vlan-only",
    enabled: true,
  }));

  const overrides: UnifiPortOverride[] = [];
  const grouped = groupByPort(input.assignments);

  for (const [port, rows] of grouped) {
    const hasTrunk = rows.some((r) => r.mode === "trunk");
    const nativeRow = rows.find((r) => r.mode === "native");
    const accessRow = rows.find((r) => r.mode === "access");

    if (hasTrunk) {
      const override: UnifiPortOverride = {
        port_idx: port,
        op_mode: "switch",
        portconf_name: "REPLACE_ME_trunk_profile",
        name: `Trunk port ${port}`,
        tagged_vlans: rows
          .filter((r) => r.mode === "trunk")
          .map((r) => r.vlanId),
      };
      if (nativeRow) override.native_vlan = nativeRow.vlanId;
      overrides.push(override);
      warnings.push(
        `Port ${port}: replace "REPLACE_ME_trunk_profile" with your real UniFi portconf_id — UniFi requires the port_overrides entry to reference an existing portconf row.`,
      );
    } else if (accessRow) {
      overrides.push({
        port_idx: port,
        op_mode: "switch",
        portconf_name: `REPLACE_ME_access_vlan_${accessRow.vlanId}`,
        name: `Access port ${port}`,
        native_vlan: accessRow.vlanId,
      });
    } else {
      warnings.push(
        `Port ${port}: couldn't infer access/trunk intent — skipped.`,
      );
    }
  }

  const unportedCount = input.assignments.filter(
    (a) => a.portNumber === null,
  ).length;
  if (unportedCount > 0) {
    warnings.push(
      `${unportedCount} device-level VLAN assignment(s) with no port number — not emitted as port_overrides.`,
    );
  }

  const payload = {
    _comment: `RackSmith export for ${input.device.name} — paste into UniFi site settings or merge via mca-ctrl -t dump-cfg.`,
    networks,
    port_overrides: overrides,
  };

  return {
    vendor: "unifi",
    text: JSON.stringify(payload, null, 2),
    warnings,
  };
}

function safeName(s: string): string {
  // Strip control + format chars so downstream consumers reading the value
  // outside JSON context (e.g. building a CLI command from the JSON) can't
  // be tricked by paste-translated line separators.
  return s
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, " ")
    .slice(0, 40)
    .trim();
}

// `groupByPort` lives in `./helpers.ts` — shared with cisco-ios.ts.
