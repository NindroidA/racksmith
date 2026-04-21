export type GlossaryEntry = {
  term: string;
  short: string;
  long?: string;
  link?: string;
};

export const GLOSSARY = {
  VLAN: {
    term: "VLAN",
    short: "Virtual LAN — logical partition of a Layer-2 network.",
    long: "A Virtual LAN groups devices across switches as if they shared a single broadcast domain. Trunk ports carry multiple VLANs tagged with 802.1Q.",
  },
  CIDR: {
    term: "CIDR",
    short: "Classless Inter-Domain Routing notation — e.g. 192.168.1.0/24.",
    long: "The /N suffix is the number of leading 1 bits in the subnet mask. /24 = 255.255.255.0 = 254 usable hosts.",
  },
  SUBNET: {
    term: "Subnet",
    short: "A partition of an IP network, defined by a prefix length.",
  },
  GATEWAY: {
    term: "Gateway",
    short: "The IP a host sends off-subnet traffic to — usually your router.",
  },
  DHCP: {
    term: "DHCP",
    short: "Dynamic Host Configuration Protocol — auto-assigns IPs to clients.",
    long: "The DHCP server hands out IPs, subnet masks, gateways, and DNS servers from a pool. Reservations bind a MAC to a specific IP.",
  },
  DNS: {
    term: "DNS",
    short: "Domain Name System — resolves names like example.com to IPs.",
  },
  NAT: {
    term: "NAT",
    short:
      "Network Address Translation — shares one public IP across many LAN clients.",
  },
  MAC: {
    term: "MAC address",
    short:
      "Hardware-layer address of a network interface (48 bits, e.g. aa:bb:cc:11:22:33).",
  },
  IP: {
    term: "IP address",
    short:
      "Network-layer address (IPv4 or IPv6) assigned to a device interface.",
  },
  IPV4: {
    term: "IPv4",
    short: "32-bit IP addressing — e.g. 192.168.1.1.",
  },
  IPV6: {
    term: "IPv6",
    short: "128-bit IP addressing — e.g. fe80::1.",
  },
  ARP: {
    term: "ARP",
    short:
      "Address Resolution Protocol — maps IPs to MACs on the local subnet.",
  },
  MTU: {
    term: "MTU",
    short:
      "Maximum Transmission Unit — largest packet the link carries without fragmentation.",
    long: "Standard Ethernet MTU is 1500 bytes. Jumbo frames (9000) reduce overhead on high-bandwidth storage networks.",
  },
  POE: {
    term: "PoE",
    short: "Power over Ethernet — delivers power through the data cable.",
    long: "802.3af (PoE, 15.4W), 802.3at (PoE+, 30W), 802.3bt (PoE++, 60W or 90W). Switches advertise a total PoE budget — sum of device draws must stay under it.",
  },
  UPLINK: {
    term: "Uplink",
    short: "Port that connects a switch to a higher-tier switch or router.",
  },
  TRUNK: {
    term: "Trunk port",
    short:
      "Switch port that carries traffic for multiple VLANs, tagged with 802.1Q.",
  },
  ACCESS_PORT: {
    term: "Access port",
    short: "Switch port assigned to a single VLAN — the typical endpoint port.",
  },
  SFP: {
    term: "SFP",
    short:
      "Small Form-factor Pluggable — hot-swappable fiber/copper transceiver slot.",
    long: "SFP (1 Gbps), SFP+ (10 Gbps), SFP28 (25 Gbps), QSFP+ (40 Gbps), QSFP28 (100 Gbps). Each module type must match the switch port rating.",
  },
  RJ45: {
    term: "RJ45",
    short: "Standard 8-pin modular connector for copper Ethernet.",
  },
  FIBER: {
    term: "Fiber",
    short: "Optical cable — higher bandwidth, longer runs, EMI-immune.",
  },
  DAC: {
    term: "DAC",
    short:
      "Direct Attach Copper — fixed copper cable with SFP transceivers on each end.",
  },
  PDU: {
    term: "PDU",
    short:
      "Power Distribution Unit — rack-mounted power strip, often metered or switched.",
  },
  UPS: {
    term: "UPS",
    short:
      "Uninterruptible Power Supply — battery backup for graceful shutdown or ride-through.",
  },
  RACK_UNIT: {
    term: "U (rack unit)",
    short: "1U = 1.75 inches (44.45 mm) of vertical rack space.",
  },
  RU: {
    term: "RU",
    short: "Rack Unit — same as U. 1RU = 1.75″ vertical.",
  },
  PATCH_PANEL: {
    term: "Patch panel",
    short:
      "Passive termination point — punched-down runs meet front-side patch jumpers.",
  },
  SWITCH: {
    term: "Switch",
    short: "Layer-2 device that forwards Ethernet frames by MAC address.",
  },
  ROUTER: {
    term: "Router",
    short: "Layer-3 device that forwards packets between subnets.",
  },
  FIREWALL: {
    term: "Firewall",
    short:
      "Device that filters traffic by rules (ports, IPs, protocols, state).",
  },
  ACL: {
    term: "ACL",
    short:
      "Access Control List — ordered match/permit/deny rules on a router or switch.",
  },
  SSID: {
    term: "SSID",
    short: "Service Set Identifier — the advertised name of a Wi-Fi network.",
  },
  WAN: {
    term: "WAN",
    short: "Wide Area Network — the side of the firewall facing the internet.",
  },
  LAN: {
    term: "LAN",
    short:
      "Local Area Network — the side of the firewall facing internal devices.",
  },
  DMZ: {
    term: "DMZ",
    short:
      "Demilitarized zone — network segment for public-facing services, isolated from LAN.",
  },
  VPN: {
    term: "VPN",
    short: "Virtual Private Network — encrypted tunnel into a private network.",
  },
  OSPF: {
    term: "OSPF",
    short: "Open Shortest Path First — link-state interior routing protocol.",
  },
  BGP: {
    term: "BGP",
    short:
      "Border Gateway Protocol — exterior routing protocol between networks.",
  },
  SNMP: {
    term: "SNMP",
    short: "Simple Network Management Protocol — monitor/poll network devices.",
  },
  NMAP: {
    term: "nmap",
    short:
      "Network scanner — discovers live hosts, open ports, and OS fingerprints.",
    link: "https://nmap.org",
  },
  PING: {
    term: "Ping",
    short: "ICMP echo — verifies reachability and round-trip latency.",
  },
  LATENCY: {
    term: "Latency",
    short:
      "Delay between sending a packet and getting a response, usually in ms.",
  },
  BANDWIDTH: {
    term: "Bandwidth",
    short: "Theoretical maximum throughput of a link, e.g. 1 Gbps.",
  },
  HOSTNAME: {
    term: "Hostname",
    short: "Human-readable name for a device on the network.",
  },
  NEC_80_RULE: {
    term: "NEC 80 % rule",
    short: "Continuous loads must not exceed 80 % of the breaker rating.",
    long: "National Electrical Code requires that any load running ≥ 3 hours be sized to ≤ 80 % of the upstream breaker. A 20 A circuit therefore tops out at 16 A continuous (1920 W on 120 V).",
  },
  DOD: {
    term: "DoD (Depth of Discharge)",
    short: "Fraction of battery capacity that's safely usable per cycle.",
    long: "Most lithium and sealed-lead-acid UPS chemistries support 0.80 DoD before life is impacted. Set this lower (0.50) for very long battery life, higher (1.0) only in emergencies.",
  },
  INVERTER_EFFICIENCY: {
    term: "Inverter efficiency",
    short: "Fraction of DC battery energy that becomes usable AC output.",
    long: "Typical UPS inverters run 0.80 – 0.90 efficient. The rest is lost as heat. Plug this in when you only know the battery's Ah and voltage and need a runtime estimate.",
  },
  BUILD_PLAN: {
    term: "Build plan",
    short: "RackSmith's wizard-driven blueprint for a new network.",
    long: "Captures your site type, device count, growth, and uplink speed; produces an equipment shopping list, VLAN scheme, and IP plan that you can materialize into real records in one click.",
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryTerm = keyof typeof GLOSSARY;

export function getGlossaryEntry(term: string): GlossaryEntry | undefined {
  const normalized = term.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return (GLOSSARY as Record<string, GlossaryEntry>)[normalized];
}
