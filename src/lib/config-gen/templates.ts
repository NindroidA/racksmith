export type VlanTemplateEntry = {
  vlanId: number;
  name: string;
  description: string;
  purpose:
    | "user"
    | "management"
    | "iot"
    | "guest"
    | "voip"
    | "storage"
    | "other";
  colorTag: "blue" | "purple" | "cyan" | "green" | "orange" | "red";
};

export type VlanTemplate = {
  id: string;
  label: string;
  blurb: string;
  audience: "homelab" | "small_it" | "msp" | "any";
  entries: VlanTemplateEntry[];
};

export const VLAN_TEMPLATES: VlanTemplate[] = [
  {
    id: "three-tier",
    label: "3-Tier (Mgmt / Server / User)",
    blurb:
      "Classic segmentation for small offices — keeps infrastructure, servers, and end-users separate.",
    audience: "small_it",
    entries: [
      {
        vlanId: 10,
        name: "Mgmt",
        description: "Switch / AP / firewall mgmt interfaces",
        purpose: "management",
        colorTag: "blue",
      },
      {
        vlanId: 20,
        name: "Servers",
        description: "Server / NAS / hypervisor",
        purpose: "storage",
        colorTag: "purple",
      },
      {
        vlanId: 30,
        name: "Users",
        description: "End-user workstations",
        purpose: "user",
        colorTag: "green",
      },
    ],
  },
  {
    id: "home",
    label: "Home (Main / IoT / Guest)",
    blurb:
      "Homelab-friendly split. Isolates IoT devices and guest Wi-Fi from your trusted network.",
    audience: "homelab",
    entries: [
      {
        // VLAN 1 is the universal default/native VLAN on every switch — putting
        // user devices on it defeats segmentation (any unconfigured port lands
        // here, and DTP/CDP/STP control traffic shares the broadcast domain).
        // Use 10 instead so segmentation is real.
        vlanId: 10,
        name: "Main",
        description: "Trusted home devices",
        purpose: "user",
        colorTag: "blue",
      },
      {
        vlanId: 20,
        name: "IoT",
        description: "Smart-home / IoT devices",
        purpose: "iot",
        colorTag: "orange",
      },
      {
        vlanId: 30,
        name: "Guest",
        description: "Guest Wi-Fi — no LAN access",
        purpose: "guest",
        colorTag: "cyan",
      },
    ],
  },
  {
    id: "msp-5",
    label: "MSP Client (Admin / Workstation / Guest / Voice / Storage)",
    blurb:
      "Full MSP client deployment — 5 VLANs covering every common traffic class.",
    audience: "msp",
    entries: [
      {
        vlanId: 10,
        name: "Admin",
        description: "Management + admin workstations",
        purpose: "management",
        colorTag: "blue",
      },
      {
        vlanId: 20,
        name: "Workstation",
        description: "Employee endpoints",
        purpose: "user",
        colorTag: "green",
      },
      {
        vlanId: 30,
        name: "Guest",
        description: "Guest Wi-Fi — internet only",
        purpose: "guest",
        colorTag: "cyan",
      },
      {
        vlanId: 40,
        name: "Voice",
        description: "VoIP phones / SIP traffic",
        purpose: "voip",
        colorTag: "purple",
      },
      {
        vlanId: 50,
        name: "Storage",
        description: "iSCSI / NFS / backup",
        purpose: "storage",
        colorTag: "orange",
      },
    ],
  },
];

export function getVlanTemplate(id: string): VlanTemplate | undefined {
  return VLAN_TEMPLATES.find((t) => t.id === id);
}
