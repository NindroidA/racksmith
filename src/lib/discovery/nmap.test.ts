import { describe, expect, it } from "vitest";
import { cidrHostCount, parseXmlOutput, validateCidr } from "./nmap";

describe("discovery/nmap.validateCidr", () => {
  it.each([
    "192.168.1.0/24",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.1.1", // single host (no mask)
    "0.0.0.0/0",
    "255.255.255.255/32",
  ])("accepts %s", (input) => {
    expect(validateCidr(input)).toBe(input.trim());
  });

  it("trims whitespace", () => {
    expect(validateCidr("  192.168.1.0/24  ")).toBe("192.168.1.0/24");
  });

  it.each([
    "",
    "not-an-ip",
    "192.168.1.0/33", // mask out of range
    "192.168.1.0/-1",
    "192.168.1.256/24", // octet out of range
    "192.168.1", // missing octet
    "192.168.1.0/24/", // trailing slash
    "192.168.1.0/24 trailing",
    "::1/64", // IPv6 — out of scope for v1
    "192.168.1.0/abc",
  ])("rejects %j", (input) => {
    expect(validateCidr(input)).toBeNull();
  });
});

describe("discovery/nmap.cidrHostCount", () => {
  it.each<[string, number]>([
    ["192.168.1.1", 1], // single host (no mask)
    ["192.168.1.0/32", 1],
    ["192.168.1.0/31", 2],
    ["192.168.1.0/30", 4],
    ["192.168.1.0/24", 256],
    ["10.0.0.0/16", 65536],
    ["10.0.0.0/8", 16777216],
    ["0.0.0.0/0", 4294967296],
  ])("counts %s as %d", (cidr, expected) => {
    expect(cidrHostCount(cidr)).toBe(expected);
  });

  it("returns 0 for invalid CIDR", () => {
    expect(cidrHostCount("not-cidr")).toBe(0);
    expect(cidrHostCount("")).toBe(0);
  });
});

describe("discovery/nmap.parseXmlOutput", () => {
  // Realistic `nmap -sn -oX -` fixture: two L2-adjacent hosts. The router
  // carries a MAC + vendor (nmap's OUI lookup) and a PTR hostname; the second
  // host has a MAC + vendor but no hostname.
  const PING_SCAN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun>
<nmaprun scanner="nmap" args="nmap -sn -oX - 192.168.1.0/24" start="1700000000" version="7.94">
<host>
<status state="up" reason="arp-response" reason_ttl="0"/>
<address addr="192.168.1.1" addrtype="ipv4"/>
<address addr="AA:BB:CC:DD:EE:FF" addrtype="mac" vendor="Ubiquiti Inc"/>
<hostnames>
<hostname name="router.local" type="PTR"/>
</hostnames>
</host>
<host>
<status state="up" reason="arp-response" reason_ttl="0"/>
<address addr="192.168.1.50" addrtype="ipv4"/>
<address addr="11:22:33:44:55:66" addrtype="mac" vendor="Synology Incorporated"/>
<hostnames>
</hostnames>
</host>
<runstats><finished time="1700000005" elapsed="5.00"/></runstats>
</nmaprun>`;

  it("returns [] for empty input", () => {
    expect(parseXmlOutput("")).toEqual([]);
  });

  it("returns [] when there are no <host> blocks", () => {
    expect(
      parseXmlOutput(`<?xml version="1.0"?><nmaprun><runstats/></nmaprun>`),
    ).toEqual([]);
  });

  it("parses a host WITH a MAC + vendor + hostname", () => {
    const hosts = parseXmlOutput(PING_SCAN_XML);
    const router = hosts.find((h) => h.ip === "192.168.1.1");
    expect(router).toMatchObject({
      ip: "192.168.1.1",
      hostname: "router.local",
      mac: "AA:BB:CC:DD:EE:FF",
      vendor: "Ubiquiti Inc",
      status: "up",
      openPorts: [],
    });
  });

  it("parses a host WITHOUT a hostname (empty <hostnames>)", () => {
    const hosts = parseXmlOutput(PING_SCAN_XML);
    const nas = hosts.find((h) => h.ip === "192.168.1.50");
    expect(nas).toMatchObject({
      ip: "192.168.1.50",
      hostname: null,
      mac: "11:22:33:44:55:66",
      vendor: "Synology Incorporated",
      status: "up",
    });
  });

  it("returns null mac + vendor for a host with only an ipv4 address (no L2 adjacency)", () => {
    const xml = `<nmaprun>
<host>
<status state="up"/>
<address addr="10.0.0.9" addrtype="ipv4"/>
<hostnames><hostname name="remote.example" type="PTR"/></hostnames>
</host>
</nmaprun>`;
    const hosts = parseXmlOutput(xml);
    expect(hosts).toHaveLength(1);
    expect(hosts[0]).toMatchObject({
      ip: "10.0.0.9",
      hostname: "remote.example",
      mac: null,
      vendor: null,
    });
  });

  it("treats a mac <address> with no vendor attribute as null vendor", () => {
    const xml = `<nmaprun>
<host>
<status state="up"/>
<address addr="10.0.0.2" addrtype="ipv4"/>
<address addr="DE:AD:BE:EF:00:01" addrtype="mac"/>
</host>
</nmaprun>`;
    const hosts = parseXmlOutput(xml);
    expect(hosts[0].mac).toBe("DE:AD:BE:EF:00:01");
    expect(hosts[0].vendor).toBeNull();
  });

  it("filters out down hosts", () => {
    const xml = `<nmaprun>
<host>
<status state="up"/>
<address addr="10.0.0.1" addrtype="ipv4"/>
</host>
<host>
<status state="down"/>
<address addr="10.0.0.2" addrtype="ipv4"/>
</host>
</nmaprun>`;
    const hosts = parseXmlOutput(xml);
    expect(hosts.map((h) => h.ip)).toEqual(["10.0.0.1"]);
  });

  it("skips a <host> block with no ipv4 address", () => {
    const xml = `<nmaprun>
<host>
<status state="up"/>
<address addr="fe80::1" addrtype="ipv6"/>
</host>
</nmaprun>`;
    expect(parseXmlOutput(xml)).toEqual([]);
  });

  it("decodes XML entities in the vendor attribute", () => {
    const xml = `<nmaprun>
<host>
<status state="up"/>
<address addr="10.0.0.3" addrtype="ipv4"/>
<address addr="00:11:22:33:44:55" addrtype="mac" vendor="Smith &amp; Co &lt;Networks&gt;"/>
</host>
</nmaprun>`;
    const hosts = parseXmlOutput(xml);
    expect(hosts[0].vendor).toBe("Smith & Co <Networks>");
  });

  it("collects open ports when a <ports> block is present (port-scan path)", () => {
    // -sn does not produce <ports>, but the parser still surfaces ports a
    // future port-scan path would emit. Only state="open" ports count.
    const xml = `<nmaprun>
<host>
<status state="up"/>
<address addr="10.0.0.5" addrtype="ipv4"/>
<ports>
<port protocol="tcp" portid="22"><state state="open" reason="syn-ack"/><service name="ssh"/></port>
<port protocol="tcp" portid="80"><state state="open" reason="syn-ack"/><service name="http"/></port>
<port protocol="tcp" portid="443"><state state="closed" reason="reset"/></port>
</ports>
</host>
</nmaprun>`;
    const hosts = parseXmlOutput(xml);
    expect(hosts[0].openPorts).toEqual([22, 80]);
  });

  it("parses self-closing <port .../> tags", () => {
    const xml = `<nmaprun>
<host>
<status state="up"/>
<address addr="10.0.0.6" addrtype="ipv4"/>
<ports>
<port protocol="tcp" portid="9100"><state state="open"/></port>
</ports>
</host>
</nmaprun>`;
    const hosts = parseXmlOutput(xml);
    expect(hosts[0].openPorts).toEqual([9100]);
  });
});
