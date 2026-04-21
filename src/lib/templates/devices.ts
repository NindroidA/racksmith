export type DeviceTemplate = {
  id: string;
  name: string;
  blurb: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  sizeU: number;
  portCount: number;
  powerWatts: number | null;
};

export const DEVICE_TEMPLATES: DeviceTemplate[] = [
  {
    id: "firewall-generic",
    name: "Firewall",
    blurb: "Generic edge firewall — customize make/model after creation.",
    deviceType: "firewall",
    manufacturer: "",
    model: "",
    sizeU: 1,
    portCount: 4,
    powerWatts: 60,
  },
  {
    id: "switch-24-port",
    name: "24-Port Switch",
    blurb: "Standard managed L2/L3 switch, gigabit copper.",
    deviceType: "switch",
    manufacturer: "",
    model: "",
    sizeU: 1,
    portCount: 24,
    powerWatts: 45,
  },
  {
    id: "switch-48-port-poe",
    name: "48-Port PoE+ Switch",
    blurb: "High-port-count access switch with PoE+ budget.",
    deviceType: "switch",
    manufacturer: "",
    model: "",
    sizeU: 1,
    portCount: 48,
    powerWatts: 600,
  },
  {
    id: "server-1u",
    name: "1U Server",
    blurb: "Single-unit server — add manufacturer/model after creation.",
    deviceType: "server",
    manufacturer: "",
    model: "",
    sizeU: 1,
    portCount: 4,
    powerWatts: 350,
  },
  {
    id: "pdu-switched",
    name: "Switched PDU",
    blurb: "Rack PDU with per-outlet switching + monitoring.",
    deviceType: "pdu",
    manufacturer: "",
    model: "",
    sizeU: 1,
    portCount: 24,
    powerWatts: null,
  },
  {
    id: "ups-1500va",
    name: "1500VA UPS",
    blurb: "Line-interactive UPS — ~1000W load with runtime to spare.",
    deviceType: "ups",
    manufacturer: "",
    model: "",
    sizeU: 2,
    portCount: 0,
    powerWatts: null,
  },
];

export function getDeviceTemplate(id: string): DeviceTemplate | undefined {
  return DEVICE_TEMPLATES.find((t) => t.id === id);
}
