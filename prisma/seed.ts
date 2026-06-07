import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "@better-auth/core/utils/id";

const prisma = new PrismaClient();

const DEVICE_CATALOG = [
  // Cisco
  {
    name: "Cisco ISR 1100",
    manufacturer: "cisco",
    model: "ISR1100",
    deviceType: "router",
    sizeU: 1,
    portCount: 8,
    powerWatts: 60,
  },
  {
    name: "Cisco Catalyst 9200L-24T",
    manufacturer: "cisco",
    model: "C9200L-24T",
    deviceType: "switch",
    sizeU: 1,
    portCount: 24,
    powerWatts: 65,
  },
  {
    name: "Cisco Catalyst 9300-48P",
    manufacturer: "cisco",
    model: "C9300-48P",
    deviceType: "switch",
    sizeU: 1,
    portCount: 48,
    powerWatts: 715,
  },
  {
    name: "Cisco ASA 5506-X",
    manufacturer: "cisco",
    model: "ASA5506-X",
    deviceType: "firewall",
    sizeU: 1,
    portCount: 8,
    powerWatts: 40,
  },

  // Ubiquiti
  {
    name: "UniFi Dream Machine Pro",
    manufacturer: "ubiquiti",
    model: "UDM-Pro",
    deviceType: "router",
    sizeU: 1,
    portCount: 11,
    powerWatts: 33,
  },
  {
    name: "UniFi Switch Enterprise 24 PoE",
    manufacturer: "ubiquiti",
    model: "USW-Enterprise-24-PoE",
    deviceType: "switch",
    sizeU: 1,
    portCount: 24,
    powerWatts: 400,
  },
  {
    name: "UniFi Switch Pro 48 PoE",
    manufacturer: "ubiquiti",
    model: "USW-Pro-48-PoE",
    deviceType: "switch",
    sizeU: 1,
    portCount: 48,
    powerWatts: 600,
  },
  {
    name: "UniFi Switch Aggregation",
    manufacturer: "ubiquiti",
    model: "USW-Aggregation",
    deviceType: "switch",
    sizeU: 1,
    portCount: 8,
    powerWatts: 35,
  },

  // Dell
  {
    name: "Dell PowerEdge R750",
    manufacturer: "dell",
    model: "R750",
    deviceType: "server",
    sizeU: 2,
    portCount: 4,
    powerWatts: 800,
  },
  {
    name: "Dell PowerEdge R650",
    manufacturer: "dell",
    model: "R650",
    deviceType: "server",
    sizeU: 1,
    portCount: 4,
    powerWatts: 600,
  },
  {
    name: "Dell PowerVault ME5024",
    manufacturer: "dell",
    model: "ME5024",
    deviceType: "storage",
    sizeU: 2,
    portCount: 4,
    powerWatts: 580,
  },

  // HP
  {
    name: "HPE ProLiant DL380 Gen10",
    manufacturer: "hp",
    model: "DL380-Gen10",
    deviceType: "server",
    sizeU: 2,
    portCount: 4,
    powerWatts: 800,
  },
  {
    name: "HPE ProLiant DL360 Gen10",
    manufacturer: "hp",
    model: "DL360-Gen10",
    deviceType: "server",
    sizeU: 1,
    portCount: 4,
    powerWatts: 500,
  },
  {
    name: "HPE Aruba 6300M 24G",
    manufacturer: "hp",
    model: "6300M-24G",
    deviceType: "switch",
    sizeU: 1,
    portCount: 24,
    powerWatts: 55,
  },

  // FS.com
  {
    name: "FS S5860-24XB-U",
    manufacturer: "fs",
    model: "S5860-24XB-U",
    deviceType: "switch",
    sizeU: 1,
    portCount: 24,
    powerWatts: 150,
  },
  {
    name: "FS S3900-48T4S",
    manufacturer: "fs",
    model: "S3900-48T4S",
    deviceType: "switch",
    sizeU: 1,
    portCount: 48,
    powerWatts: 65,
  },

  // TrippLite
  {
    name: "TrippLite SmartOnline 1500VA",
    manufacturer: "tripplite",
    model: "SU1500RTXL2UA",
    deviceType: "ups",
    sizeU: 2,
    portCount: 0,
    powerWatts: 1200,
  },
  {
    name: "TrippLite SmartOnline 3000VA",
    manufacturer: "tripplite",
    model: "SU3000RTXL3U",
    deviceType: "ups",
    sizeU: 3,
    portCount: 0,
    powerWatts: 2400,
  },
  {
    name: "TrippLite PDU 24-Outlet",
    manufacturer: "tripplite",
    model: "PDUMV30HV",
    deviceType: "pdu",
    sizeU: 0,
    portCount: 24,
    powerWatts: 0,
  },

  // Generic
  {
    name: "24-Port Cat6 Patch Panel",
    manufacturer: "custom",
    model: "PP-24-CAT6",
    deviceType: "patch_panel",
    sizeU: 1,
    portCount: 24,
    powerWatts: 0,
  },
  {
    name: "48-Port Cat6a Patch Panel",
    manufacturer: "custom",
    model: "PP-48-CAT6A",
    deviceType: "patch_panel",
    sizeU: 2,
    portCount: 48,
    powerWatts: 0,
  },
  {
    name: "1U Brush Panel",
    manufacturer: "custom",
    model: "BP-1U",
    deviceType: "other",
    sizeU: 1,
    portCount: 0,
    powerWatts: 0,
    description: "Cable management brush panel",
  },
  {
    name: "1U Blank Panel",
    manufacturer: "custom",
    model: "BLANK-1U",
    deviceType: "other",
    sizeU: 1,
    portCount: 0,
    powerWatts: 0,
    description: "Blank filler panel",
  },

  // ─── Switches ───────────────────────────────────

  // Cisco Catalyst / Nexus
  {
    name: "Cisco Catalyst 9200-24T",
    manufacturer: "cisco",
    model: "C9200-24T",
    deviceType: "switch",
    sizeU: 1,
    portCount: 24,
    powerWatts: 65,
    description: "24-port Gigabit access switch, modular uplinks",
  },
  {
    name: "Cisco Catalyst 9300-24P",
    manufacturer: "cisco",
    model: "C9300-24P",
    deviceType: "switch",
    sizeU: 1,
    portCount: 24,
    powerWatts: 437,
    description: "24-port PoE+ stackable access switch (StackWise-480)",
  },
  {
    name: "Cisco Nexus 9300 (93180YC-FX)",
    manufacturer: "cisco",
    model: "N9K-C93180YC-FX",
    deviceType: "switch",
    sizeU: 1,
    portCount: 54,
    powerWatts: 350,
    description: "48x 10/25G SFP28 + 6x 40/100G QSFP28 data center leaf switch",
  },

  // Ubiquiti UniFi
  {
    name: "UniFi Switch Pro 24 PoE",
    manufacturer: "ubiquiti",
    model: "USW-Pro-24-PoE",
    deviceType: "switch",
    sizeU: 1,
    portCount: 24,
    powerWatts: 400,
    description: "24-port L3 PoE+ switch with 2x 25G SFP28 uplinks",
  },
  {
    name: "UniFi Switch Enterprise 48 PoE",
    manufacturer: "ubiquiti",
    model: "USW-Enterprise-48-PoE",
    deviceType: "switch",
    sizeU: 1,
    portCount: 48,
    powerWatts: 720,
    description: "48-port 2.5GbE PoE++ L3 switch with 4x 10G SFP+ uplinks",
  },
  {
    name: "UniFi Switch Aggregation Pro",
    manufacturer: "ubiquiti",
    model: "USW-Pro-Aggregation",
    deviceType: "switch",
    sizeU: 1,
    portCount: 32,
    powerWatts: 80,
    description: "28x 10G SFP+ and 4x 25G SFP28 aggregation switch",
  },

  // Netgear M-series
  {
    name: "Netgear M4250-26G4F-PoE+",
    manufacturer: "netgear",
    model: "GSM4230P",
    deviceType: "switch",
    sizeU: 1,
    portCount: 26,
    powerWatts: 480,
    description: "24-port AV-line PoE+ managed switch with 2x SFP",
  },
  {
    name: "Netgear M4300-48X",
    manufacturer: "netgear",
    model: "XSM4348CS",
    deviceType: "switch",
    sizeU: 1,
    portCount: 48,
    powerWatts: 175,
    description: "48-port 10GBASE-T stackable L3 managed switch",
  },

  // MikroTik CRS
  {
    name: "MikroTik CRS354-48G-4S+2Q+",
    manufacturer: "mikrotik",
    model: "CRS354-48G-4S+2Q+RM",
    deviceType: "switch",
    sizeU: 1,
    portCount: 54,
    powerWatts: 60,
    description: "48x Gigabit + 4x 10G SFP+ + 2x 40G QSFP+ managed switch",
  },
  {
    name: "MikroTik CRS328-24P-4S+",
    manufacturer: "mikrotik",
    model: "CRS328-24P-4S+RM",
    deviceType: "switch",
    sizeU: 1,
    portCount: 28,
    powerWatts: 500,
    description: "24-port Gigabit PoE-out + 4x 10G SFP+ managed switch",
  },

  // Aruba / HPE
  {
    name: "Aruba 6300M 48G PoE+",
    manufacturer: "hp",
    model: "JL663A",
    deviceType: "switch",
    sizeU: 1,
    portCount: 48,
    powerWatts: 740,
    description: "48-port Class 4 PoE+ L3 switch with 4x SFP56 uplinks",
  },
  {
    name: "Aruba 2930F 48G PoE+",
    manufacturer: "hp",
    model: "JL558A",
    deviceType: "switch",
    sizeU: 1,
    portCount: 48,
    powerWatts: 740,
    description: "48-port PoE+ L3 access switch with 4x SFP+ uplinks",
  },

  // TP-Link Omada / JetStream
  {
    name: "TP-Link Omada SG3428MP",
    manufacturer: "tplink",
    model: "SG3428MP",
    deviceType: "switch",
    sizeU: 1,
    portCount: 28,
    powerWatts: 384,
    description: "24-port Gigabit PoE+ managed switch with 4x SFP slots",
  },
  {
    name: "TP-Link JetStream T2600G-52TS",
    manufacturer: "tplink",
    model: "T2600G-52TS",
    deviceType: "switch",
    sizeU: 1,
    portCount: 52,
    powerWatts: 40,
    description: "48-port Gigabit L2+ managed switch with 4x SFP slots",
  },

  // ─── Routers / Gateways ─────────────────────────

  // Ubiquiti
  {
    name: "UniFi Dream Machine SE",
    manufacturer: "ubiquiti",
    model: "UDM-SE",
    deviceType: "router",
    sizeU: 1,
    portCount: 10,
    powerWatts: 45,
    description: "All-in-one gateway with 8-port PoE switch and NVR",
  },
  {
    name: "UniFi Next-Gen Gateway Pro",
    manufacturer: "ubiquiti",
    model: "UXG-Pro",
    deviceType: "router",
    sizeU: 1,
    portCount: 4,
    powerWatts: 27,
    description: "2.5GbE security gateway with 2x 10G SFP+ WAN/LAN",
  },

  // MikroTik
  {
    name: "MikroTik CCR2004-1G-12S+2XS",
    manufacturer: "mikrotik",
    model: "CCR2004-1G-12S+2XS",
    deviceType: "router",
    sizeU: 1,
    portCount: 15,
    powerWatts: 60,
    description: "Cloud Core Router, 12x 10G SFP+ and 2x 25G SFP28",
  },
  {
    name: "MikroTik RB5009UG+S+",
    manufacturer: "mikrotik",
    model: "RB5009UG+S+IN",
    deviceType: "router",
    sizeU: 1,
    portCount: 9,
    powerWatts: 22,
    description: "8-port router with 2.5GbE and 10G SFP+, ARM CPU",
  },

  // Netgate / pfSense
  {
    name: "Netgate 4100 (pfSense+)",
    manufacturer: "netgate",
    model: "4100",
    deviceType: "router",
    sizeU: 1,
    portCount: 5,
    powerWatts: 35,
    description: "pfSense+ security gateway/router appliance, Atom C-series",
  },
  {
    name: "Netgate 6100 (pfSense+)",
    manufacturer: "netgate",
    model: "6100",
    deviceType: "router",
    sizeU: 1,
    portCount: 6,
    powerWatts: 45,
    description: "pfSense+ gateway with 2x 10G SFP+ and 4x 2.5GbE",
  },

  // Cisco ISR
  {
    name: "Cisco ISR 4331",
    manufacturer: "cisco",
    model: "ISR4331",
    deviceType: "router",
    sizeU: 1,
    portCount: 3,
    powerWatts: 75,
    description: "Integrated Services Router, modular WAN edge, up to 100 Mbps",
  },

  // ─── Firewalls ──────────────────────────────────

  // Fortinet FortiGate
  {
    name: "Fortinet FortiGate 60F",
    manufacturer: "fortinet",
    model: "FG-60F",
    deviceType: "firewall",
    sizeU: 1,
    portCount: 10,
    powerWatts: 16,
    description:
      "Desktop/rack NGFW, 10 GbE ports, SD-WAN and threat protection",
  },
  {
    name: "Fortinet FortiGate 100F",
    manufacturer: "fortinet",
    model: "FG-100F",
    deviceType: "firewall",
    sizeU: 1,
    portCount: 22,
    powerWatts: 40,
    description: "1U NGFW with 2x 10G SFP+ and dedicated security processors",
  },

  // Palo Alto
  {
    name: "Palo Alto PA-440",
    manufacturer: "paloalto",
    model: "PA-440",
    deviceType: "firewall",
    sizeU: 1,
    portCount: 8,
    powerWatts: 35,
    description: "1U next-gen firewall, ML-powered threat prevention",
  },
  {
    name: "Palo Alto PA-3220",
    manufacturer: "paloalto",
    model: "PA-3220",
    deviceType: "firewall",
    sizeU: 1,
    portCount: 20,
    powerWatts: 210,
    description: "1U NGFW with 12x 1G RJ45 and 8x SFP/SFP+ interfaces",
  },

  // SonicWall
  {
    name: "SonicWall TZ670",
    manufacturer: "sonicwall",
    model: "TZ670",
    deviceType: "firewall",
    sizeU: 1,
    portCount: 10,
    powerWatts: 38,
    description: "Desktop NGFW with 10G SFP+, multi-gigabit threat prevention",
  },
  {
    name: "SonicWall NSa 2700",
    manufacturer: "sonicwall",
    model: "NSa-2700",
    deviceType: "firewall",
    sizeU: 1,
    portCount: 18,
    powerWatts: 75,
    description: "1U mid-range NGFW with 16x 1G and 2x 10G SFP+ ports",
  },

  // Ubiquiti UniFi Gateway
  {
    name: "UniFi Gateway Enterprise",
    manufacturer: "ubiquiti",
    model: "UXG-Enterprise",
    deviceType: "firewall",
    sizeU: 1,
    portCount: 6,
    powerWatts: 33,
    description: "2.5GbE/10G security gateway with IDS/IPS, multi-WAN",
  },

  // ─── Servers ────────────────────────────────────

  // Dell PowerEdge
  {
    name: "Dell PowerEdge R350",
    manufacturer: "dell",
    model: "R350",
    deviceType: "server",
    sizeU: 1,
    portCount: 2,
    powerWatts: 350,
    description: "1U single-socket Xeon E entry rack server",
  },
  {
    name: "Dell PowerEdge R450",
    manufacturer: "dell",
    model: "R450",
    deviceType: "server",
    sizeU: 1,
    portCount: 4,
    powerWatts: 550,
    description: "1U dual-socket Xeon Scalable general-purpose server",
  },

  // HPE ProLiant
  {
    name: "HPE ProLiant DL360 Gen11",
    manufacturer: "hp",
    model: "DL360-Gen11",
    deviceType: "server",
    sizeU: 1,
    portCount: 4,
    powerWatts: 800,
    description: "1U dual-socket 4th/5th Gen Xeon Scalable rack server",
  },
  {
    name: "HPE ProLiant DL380 Gen11",
    manufacturer: "hp",
    model: "DL380-Gen11",
    deviceType: "server",
    sizeU: 2,
    portCount: 4,
    powerWatts: 1000,
    description: "2U dual-socket flagship rack server, high expandability",
  },

  // Supermicro
  {
    name: "Supermicro SuperServer 1029P (1U)",
    manufacturer: "supermicro",
    model: "SYS-1029P-WTRT",
    deviceType: "server",
    sizeU: 1,
    portCount: 4,
    powerWatts: 600,
    description: "1U dual-socket Xeon Scalable server with 2x 10GbE",
  },
  {
    name: "Supermicro SuperServer 2029U (2U)",
    manufacturer: "supermicro",
    model: "SYS-2029U-TR4",
    deviceType: "server",
    sizeU: 2,
    portCount: 4,
    powerWatts: 1000,
    description: '2U dual-socket Ultra server, 24x 2.5" bays',
  },

  // Lenovo ThinkSystem
  {
    name: "Lenovo ThinkSystem SR630 V3",
    manufacturer: "lenovo",
    model: "SR630-V3",
    deviceType: "server",
    sizeU: 1,
    portCount: 4,
    powerWatts: 750,
    description: "1U dual-socket 4th Gen Xeon Scalable rack server",
  },
  {
    name: "Lenovo ThinkSystem SR650 V3",
    manufacturer: "lenovo",
    model: "SR650-V3",
    deviceType: "server",
    sizeU: 2,
    portCount: 4,
    powerWatts: 1100,
    description:
      "2U dual-socket mainstream rack server, broad GPU/storage support",
  },

  // ─── Storage / NAS ──────────────────────────────

  // Synology RackStation
  {
    name: "Synology RackStation RS422+",
    manufacturer: "synology",
    model: "RS422+",
    deviceType: "storage",
    sizeU: 1,
    portCount: 1,
    powerWatts: 40,
    description: "1U 4-bay short-depth rackmount NAS for SMB",
  },
  {
    name: "Synology RackStation RS1221+",
    manufacturer: "synology",
    model: "RS1221+",
    deviceType: "storage",
    sizeU: 1,
    portCount: 4,
    powerWatts: 100,
    description: "1U 8-bay rackmount NAS, Ryzen V1500B, expandable to 16 bays",
  },
  {
    name: "Synology RackStation RS3621xs+",
    manufacturer: "synology",
    model: "RS3621xs+",
    deviceType: "storage",
    sizeU: 2,
    portCount: 4,
    powerWatts: 250,
    description: "2U 12-bay enterprise NAS with 10GbE, expandable to 36 bays",
  },

  // QNAP
  {
    name: "QNAP TS-1273AU-RP",
    manufacturer: "qnap",
    model: "TS-1273AU-RP",
    deviceType: "storage",
    sizeU: 2,
    portCount: 4,
    powerWatts: 230,
    description: "2U 12-bay AMD Ryzen rackmount NAS with redundant PSU",
  },
  {
    name: "QNAP TS-853DU-RP",
    manufacturer: "qnap",
    model: "TS-853DU-RP",
    deviceType: "storage",
    sizeU: 1,
    portCount: 4,
    powerWatts: 120,
    description: "1U 8-bay rackmount NAS with 2x 2.5GbE and redundant PSU",
  },

  // TrueNAS / iXsystems
  {
    name: "TrueNAS Mini R",
    manufacturer: "truenas",
    model: "Mini-R",
    deviceType: "storage",
    sizeU: 2,
    portCount: 4,
    powerWatts: 200,
    description: "2U 12-bay short-depth ZFS storage appliance",
  },
  {
    name: "TrueNAS R-Series R20",
    manufacturer: "truenas",
    model: "R20",
    deviceType: "storage",
    sizeU: 2,
    portCount: 4,
    powerWatts: 400,
    description:
      "2U 12-bay enterprise ZFS storage with dual controllers option",
  },

  // Dell PowerVault
  {
    name: "Dell PowerVault ME5012",
    manufacturer: "dell",
    model: "ME5012",
    deviceType: "storage",
    sizeU: 2,
    portCount: 4,
    powerWatts: 560,
    description: '2U 12-bay (3.5") SAS storage array, dual controllers',
  },

  // ─── UPS ────────────────────────────────────────

  // APC Smart-UPS
  {
    name: "APC Smart-UPS SMT1500RM2U",
    manufacturer: "apc",
    model: "SMT1500RM2U",
    deviceType: "ups",
    sizeU: 2,
    portCount: 0,
    powerWatts: 1000,
    description: "1500VA / 1000W line-interactive rack UPS, 2U",
  },
  {
    name: "APC Smart-UPS SMT2200RM2U",
    manufacturer: "apc",
    model: "SMT2200RM2U",
    deviceType: "ups",
    sizeU: 2,
    portCount: 0,
    powerWatts: 1980,
    description: "2200VA / 1980W line-interactive rack UPS, 2U",
  },
  {
    name: "APC Smart-UPS SMX3000RMLV2U",
    manufacturer: "apc",
    model: "SMX3000RMLV2U",
    deviceType: "ups",
    sizeU: 2,
    portCount: 0,
    powerWatts: 2700,
    description: "3000VA / 2700W line-interactive rack/tower UPS, 2U",
  },

  // CyberPower
  {
    name: "CyberPower OR1500LCDRM1U",
    manufacturer: "cyberpower",
    model: "OR1500LCDRM1U",
    deviceType: "ups",
    sizeU: 1,
    portCount: 0,
    powerWatts: 900,
    description: "1500VA / 900W line-interactive 1U rack UPS",
  },
  {
    name: "CyberPower PR2200RT2U",
    manufacturer: "cyberpower",
    model: "PR2200RT2U",
    deviceType: "ups",
    sizeU: 2,
    portCount: 0,
    powerWatts: 2000,
    description: "2200VA / 2000W sine-wave rack/tower UPS, 2U",
  },

  // Eaton
  {
    name: "Eaton 5PX 1500 RT2U",
    manufacturer: "eaton",
    model: "5PX1500RT",
    deviceType: "ups",
    sizeU: 2,
    portCount: 0,
    powerWatts: 1350,
    description: "1500VA / 1350W line-interactive rack/tower UPS, 2U",
  },
  {
    name: "Eaton 9PX 3000 RT3U",
    manufacturer: "eaton",
    model: "9PX3000RT",
    deviceType: "ups",
    sizeU: 3,
    portCount: 0,
    powerWatts: 3000,
    description: "3000VA / 3000W double-conversion online rack/tower UPS, 3U",
  },

  // ─── PDU ────────────────────────────────────────

  // APC Rack PDU
  {
    name: "APC Rack PDU Metered AP8853",
    manufacturer: "apc",
    model: "AP8853",
    deviceType: "pdu",
    sizeU: 0,
    portCount: 24,
    powerWatts: 0,
    description: "Zero-U metered rack PDU, 24x C13/C15, 208V 30A",
  },
  {
    name: "APC Rack PDU Switched AP8941",
    manufacturer: "apc",
    model: "AP8941",
    deviceType: "pdu",
    sizeU: 0,
    portCount: 24,
    powerWatts: 0,
    description: "Zero-U switched rack PDU, per-outlet control, 208V 30A",
  },

  // Vertiv / Geist
  {
    name: "Vertiv Geist Switched PDU",
    manufacturer: "vertiv",
    model: "GU30001",
    deviceType: "pdu",
    sizeU: 0,
    portCount: 24,
    powerWatts: 0,
    description: "Zero-U Geist switched rack PDU with remote outlet control",
  },

  // CyberPower switched PDU
  {
    name: "CyberPower Switched PDU PDU41005",
    manufacturer: "cyberpower",
    model: "PDU41005",
    deviceType: "pdu",
    sizeU: 1,
    portCount: 16,
    powerWatts: 0,
    description: "1U switched metered-by-outlet PDU, 16x C13, 200-240V 20A",
  },

  // Tripp Lite PDU
  {
    name: "Tripp Lite Switched PDU PDUMH30HVNET",
    manufacturer: "tripplite",
    model: "PDUMH30HVNET",
    deviceType: "pdu",
    sizeU: 1,
    portCount: 20,
    powerWatts: 0,
    description: "1U switched rack PDU with network metering, 208V 30A",
  },

  // ─── Other rack gear ────────────────────────────
  {
    name: "24-Port Cat6a Patch Panel",
    manufacturer: "custom",
    model: "PP-24-CAT6A",
    deviceType: "patch_panel",
    sizeU: 1,
    portCount: 24,
    powerWatts: 0,
    description: "24-port shielded Cat6a keystone patch panel",
  },
  {
    name: "48-Port Cat6 Patch Panel",
    manufacturer: "custom",
    model: "PP-48-CAT6",
    deviceType: "patch_panel",
    sizeU: 2,
    portCount: 48,
    powerWatts: 0,
    description: "48-port Cat6 keystone patch panel",
  },
  {
    name: "1U 8-Port LCD KVM Console",
    manufacturer: "custom",
    model: "KVM-8-1U",
    deviceType: "other",
    sizeU: 1,
    portCount: 8,
    powerWatts: 15,
    description: "1U rackmount 8-port KVM switch with slide-out LCD console",
  },
  {
    name: "1U Horizontal Cable Manager",
    manufacturer: "custom",
    model: "CM-1U",
    deviceType: "other",
    sizeU: 1,
    portCount: 0,
    powerWatts: 0,
    description: "1U horizontal cable management panel with D-rings",
  },
  {
    name: "1U Vented Rack Shelf",
    manufacturer: "custom",
    model: "SHELF-1U",
    deviceType: "other",
    sizeU: 1,
    portCount: 0,
    powerWatts: 0,
    description: "1U fixed vented shelf for non-rackmount gear",
  },
  {
    name: "Raspberry Pi 1U Rack Mount (4-Bay)",
    manufacturer: "custom",
    model: "RPI-RACK-1U",
    deviceType: "other",
    sizeU: 1,
    portCount: 0,
    powerWatts: 25,
    description:
      "1U rack mount holding up to 4 Raspberry Pi single-board computers",
  },
  {
    name: "UniFi Network Video Recorder Pro",
    manufacturer: "ubiquiti",
    model: "UNVR-Pro",
    deviceType: "other",
    sizeU: 1,
    portCount: 1,
    powerWatts: 50,
    description: '1U UniFi Protect NVR, 7x 3.5" bays, 10G SFP+',
  },
  {
    name: "Synology Deep Learning NVR DVA3221",
    manufacturer: "synology",
    model: "DVA3221",
    deviceType: "other",
    sizeU: 0,
    portCount: 2,
    powerWatts: 60,
    description: "Surveillance NVR with AI-based deep-learning video analytics",
  },
];

// Known-good dev credentials. Intentionally trivial — only ever written when
// NODE_ENV !== "production", so this cannot leak into prod even if the seed
// command is run against a deployed DB. Override via SEED_DEV_PASSWORD.
const DEV_EMAIL = "dev@racksmith.local";
const DEV_PASSWORD = process.env.SEED_DEV_PASSWORD ?? "devpassword";
const DEV_NAME = "Dev User";
const DEV_ORG_NAME = "Dev Workspace";
const DEV_ORG_SLUG = "dev-workspace";

/**
 * Seed a known dev user + Pro-tier workspace so developers can log in locally
 * without registering each time. Only runs in non-production environments —
 * gated by the caller.
 *
 * Idempotent: re-running produces no duplicates. We upsert the User /
 * Organization / Member rows by stable keys (email / slug / composite
 * (userId, organizationId)) and upsert the Account row by stable id.
 *
 * Password path: we use Better Auth's own `hashPassword` (scrypt via
 * `@better-auth/utils/password`) to write the `Account.password` column
 * directly. This produces the exact hash format BA's login flow expects,
 * without having to stand up a Next request to call `auth.api.signUpEmail`
 * (which transitively imports `server-only` modules and can't run from a CLI
 * script).
 */
async function seedDevUser() {
  // 1. User row. Stable id so the Account foreign key stays consistent across
  //    re-runs. BA-style 32-char alphanumeric id.
  const DEV_USER_ID = "devuser0000000000000000000000000";
  const DEV_ACCOUNT_ID = "devaccount000000000000000000000000";

  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: {
      emailVerified: true,
      name: DEV_NAME,
    },
    create: {
      id: DEV_USER_ID,
      email: DEV_EMAIL,
      emailVerified: true,
      name: DEV_NAME,
    },
    select: { id: true },
  });

  // 2. Account row holding the password hash. BA's credential provider keys
  //    Account by `{ providerId: "credential", accountId: <userId> }`. We find
  //    it first (no unique index on that pair in the schema) and upsert by id.
  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  });
  const passwordHash = await hashPassword(DEV_PASSWORD);

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        id: DEV_ACCOUNT_ID,
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }

  // 3. Pro-tier workspace. Keyed by slug — the unique index guarantees
  //    idempotence across re-runs.
  const org = await prisma.organization.upsert({
    where: { slug: DEV_ORG_SLUG },
    update: { plan: "pro", planExpiresAt: null },
    create: {
      name: DEV_ORG_NAME,
      slug: DEV_ORG_SLUG,
      plan: "pro",
    },
    select: { id: true },
  });

  // 4. Member link. Composite unique (userId, organizationId) keeps this
  //    idempotent — re-running just re-asserts the owner role.
  await prisma.member.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: { role: "owner" },
    create: {
      userId: user.id,
      organizationId: org.id,
      role: "owner",
    },
  });

  // 5. Point the user at the dev org so login lands straight in the dashboard.
  await prisma.user.update({
    where: { id: user.id },
    data: { activeOrganizationId: org.id },
  });

  console.log("");
  console.log(
    `✓ Dev user seeded: ${DEV_EMAIL} (password: $SEED_DEV_PASSWORD or the "devpassword" default)`,
  );
  console.log(`  Workspace: "${DEV_ORG_NAME}" (${DEV_ORG_SLUG}, plan=pro)`);
  console.log(`  Login at http://localhost:3000/login`);
  console.log("");
}

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

  // Dev-login seed — non-production only. Never writes credentials to a prod
  // DB even by accident.
  if (process.env.NODE_ENV !== "production") {
    await seedDevUser();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
