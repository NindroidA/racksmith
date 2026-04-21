import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEVICE_CATALOG = [
  // Cisco
  { name: "Cisco ISR 1100", manufacturer: "cisco", model: "ISR1100", deviceType: "router", sizeU: 1, portCount: 8, powerWatts: 60 },
  { name: "Cisco Catalyst 9200L-24T", manufacturer: "cisco", model: "C9200L-24T", deviceType: "switch", sizeU: 1, portCount: 24, powerWatts: 65 },
  { name: "Cisco Catalyst 9300-48P", manufacturer: "cisco", model: "C9300-48P", deviceType: "switch", sizeU: 1, portCount: 48, powerWatts: 715 },
  { name: "Cisco ASA 5506-X", manufacturer: "cisco", model: "ASA5506-X", deviceType: "firewall", sizeU: 1, portCount: 8, powerWatts: 40 },

  // Ubiquiti
  { name: "UniFi Dream Machine Pro", manufacturer: "ubiquiti", model: "UDM-Pro", deviceType: "router", sizeU: 1, portCount: 11, powerWatts: 33 },
  { name: "UniFi Switch Enterprise 24 PoE", manufacturer: "ubiquiti", model: "USW-Enterprise-24-PoE", deviceType: "switch", sizeU: 1, portCount: 24, powerWatts: 400 },
  { name: "UniFi Switch Pro 48 PoE", manufacturer: "ubiquiti", model: "USW-Pro-48-PoE", deviceType: "switch", sizeU: 1, portCount: 48, powerWatts: 600 },
  { name: "UniFi Switch Aggregation", manufacturer: "ubiquiti", model: "USW-Aggregation", deviceType: "switch", sizeU: 1, portCount: 8, powerWatts: 35 },

  // Dell
  { name: "Dell PowerEdge R750", manufacturer: "dell", model: "R750", deviceType: "server", sizeU: 2, portCount: 4, powerWatts: 800 },
  { name: "Dell PowerEdge R650", manufacturer: "dell", model: "R650", deviceType: "server", sizeU: 1, portCount: 4, powerWatts: 600 },
  { name: "Dell PowerVault ME5024", manufacturer: "dell", model: "ME5024", deviceType: "storage", sizeU: 2, portCount: 4, powerWatts: 580 },

  // HP
  { name: "HPE ProLiant DL380 Gen10", manufacturer: "hp", model: "DL380-Gen10", deviceType: "server", sizeU: 2, portCount: 4, powerWatts: 800 },
  { name: "HPE ProLiant DL360 Gen10", manufacturer: "hp", model: "DL360-Gen10", deviceType: "server", sizeU: 1, portCount: 4, powerWatts: 500 },
  { name: "HPE Aruba 6300M 24G", manufacturer: "hp", model: "6300M-24G", deviceType: "switch", sizeU: 1, portCount: 24, powerWatts: 55 },

  // FS.com
  { name: "FS S5860-24XB-U", manufacturer: "fs", model: "S5860-24XB-U", deviceType: "switch", sizeU: 1, portCount: 24, powerWatts: 150 },
  { name: "FS S3900-48T4S", manufacturer: "fs", model: "S3900-48T4S", deviceType: "switch", sizeU: 1, portCount: 48, powerWatts: 65 },

  // TrippLite
  { name: "TrippLite SmartOnline 1500VA", manufacturer: "tripplite", model: "SU1500RTXL2UA", deviceType: "ups", sizeU: 2, portCount: 0, powerWatts: 1200 },
  { name: "TrippLite SmartOnline 3000VA", manufacturer: "tripplite", model: "SU3000RTXL3U", deviceType: "ups", sizeU: 3, portCount: 0, powerWatts: 2400 },
  { name: "TrippLite PDU 24-Outlet", manufacturer: "tripplite", model: "PDUMV30HV", deviceType: "pdu", sizeU: 0, portCount: 24, powerWatts: 0 },

  // Generic
  { name: "24-Port Cat6 Patch Panel", manufacturer: "custom", model: "PP-24-CAT6", deviceType: "patch_panel", sizeU: 1, portCount: 24, powerWatts: 0 },
  { name: "48-Port Cat6a Patch Panel", manufacturer: "custom", model: "PP-48-CAT6A", deviceType: "patch_panel", sizeU: 2, portCount: 48, powerWatts: 0 },
  { name: "1U Brush Panel", manufacturer: "custom", model: "BP-1U", deviceType: "other", sizeU: 1, portCount: 0, powerWatts: 0, description: "Cable management brush panel" },
  { name: "1U Blank Panel", manufacturer: "custom", model: "BLANK-1U", deviceType: "other", sizeU: 1, portCount: 0, powerWatts: 0, description: "Blank filler panel" },
];

async function main() {
  console.log("Seeding device catalog...");

  for (const device of DEVICE_CATALOG) {
    await prisma.deviceCatalog.upsert({
      where: {
        manufacturer_model: {
          manufacturer: device.manufacturer,
          model: device.model,
        },
      },
      update: device,
      create: device,
    });
  }

  console.log(`Seeded ${DEVICE_CATALOG.length} devices in catalog.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
