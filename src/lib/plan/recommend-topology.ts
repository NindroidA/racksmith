import type {
  ProfileInput,
  RecommendedDevice,
  SiteType,
  UplinkSpeed,
} from "./wizard-types";

// Equipment shopping list derived from the profile. Numbers come from a
// lightweight rule-based model: enough switch ports for the projected
// device count × growth multiplier, an appropriately-sized firewall, and
// enough APs to cover the rough device count assuming ~25 clients per AP.

const PORTS_PER_ACCESS_SWITCH = 24;
const CLIENTS_PER_AP = 25;
const POE_PER_AP_W = 20; // typical AP draw

function pickAccessSwitch(
  uplink: UplinkSpeed,
  poePerSwitchW: number,
): RecommendedDevice {
  if (uplink === "1G") {
    return {
      manufacturer: "Ubiquiti",
      model: poePerSwitchW > 0 ? "USW-24-PoE" : "USW-24",
      deviceType: "switch",
      sizeU: 1,
      portCount: 24,
      powerWatts: poePerSwitchW > 0 ? Math.max(95, poePerSwitchW) : 30,
      reason:
        "Standard 24-port access switch sized for the projected endpoint count.",
    };
  }
  if (uplink === "10G") {
    return {
      manufacturer: "Ubiquiti",
      model: "USW-Pro-Max-24-PoE",
      deviceType: "switch",
      sizeU: 1,
      portCount: 24,
      powerWatts: poePerSwitchW > 0 ? Math.max(400, poePerSwitchW) : 60,
      reason:
        "10G uplink-capable access switch with PoE+ for downstream APs.",
    };
  }
  return {
    manufacturer: "Arista",
    model: "7050X3-32S",
    deviceType: "switch",
    sizeU: 1,
    portCount: 32,
    powerWatts: 250,
    reason:
      "25/100G top-of-rack class — overkill for SMB, sized for MSP-grade deployments.",
  };
}

function pickFirewall(
  siteType: SiteType,
  uplink: UplinkSpeed,
): RecommendedDevice {
  if (siteType === "home") {
    return {
      manufacturer: "Ubiquiti",
      model: "Cloud Gateway Ultra",
      deviceType: "firewall",
      sizeU: 0,
      portCount: 5,
      powerWatts: 12,
      reason: "Inexpensive multi-WAN gateway for homelab + small home networks.",
    };
  }
  if (uplink === "1G") {
    return {
      manufacturer: "Ubiquiti",
      model: "UDM Pro",
      deviceType: "firewall",
      sizeU: 1,
      portCount: 9,
      powerWatts: 50,
      reason: "1G WAN, integrated controller, IDS/IPS for office workloads.",
    };
  }
  return {
    manufacturer: "Fortinet",
    model: "FortiGate 200F",
    deviceType: "firewall",
    sizeU: 1,
    portCount: 18,
    powerWatts: 150,
    reason: "10G+ ready firewall for MSP / dense small-office sites.",
  };
}

function pickWap(): RecommendedDevice {
  return {
    manufacturer: "Ubiquiti",
    model: "U7 Pro",
    deviceType: "other",
    sizeU: 0,
    portCount: 1,
    powerWatts: POE_PER_AP_W,
    reason: "Wi-Fi 7 access point sized for ~25 client devices.",
  };
}

export function recommendTopology(
  profile: ProfileInput,
): RecommendedDevice[] {
  if (profile.deviceCount <= 0 || profile.growthMultiplier <= 0) return [];

  const projected = Math.ceil(profile.deviceCount * profile.growthMultiplier);
  const accessSwitchCount = Math.max(
    1,
    Math.ceil(projected / PORTS_PER_ACCESS_SWITCH),
  );
  const apCount = Math.max(1, Math.ceil(projected / CLIENTS_PER_AP));
  const poePerSwitchW =
    profile.poeBudgetW > 0
      ? Math.ceil(profile.poeBudgetW / accessSwitchCount)
      : 0;

  const devices: RecommendedDevice[] = [];
  for (let i = 0; i < accessSwitchCount; i++) {
    devices.push({
      ...pickAccessSwitch(profile.uplinkSpeed, poePerSwitchW),
      reason:
        i === 0
          ? "Primary access switch — ports sized for projected endpoints (count × growth)."
          : `Additional access switch #${i + 1} — adds ${PORTS_PER_ACCESS_SWITCH} ports for headroom.`,
    });
  }
  devices.push(pickFirewall(profile.siteType, profile.uplinkSpeed));
  for (let i = 0; i < apCount; i++) {
    devices.push({
      ...pickWap(),
      reason:
        i === 0
          ? `Wireless coverage — sized for ~${CLIENTS_PER_AP} clients per AP.`
          : `Additional AP #${i + 1} — keeps per-radio client count under ${CLIENTS_PER_AP}.`,
    });
  }
  return devices;
}

export function recommendRackSizeU(devices: ReadonlyArray<RecommendedDevice>): number {
  const used = devices.reduce((sum, d) => sum + Math.max(0, d.sizeU), 0);
  // Round up to next standard size (12U, 22U, 24U, 42U).
  const standard = [12, 22, 24, 42];
  for (const s of standard) {
    if (s >= used + 4) return s; // keep 4U buffer
  }
  return Math.max(used + 4, 42);
}
