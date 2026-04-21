import { describe, expect, it } from "vitest";
import { compressVlanList } from "./cisco-ios";
import { compressPortList } from "./hpe-aruba";
import { generateConfig, type ConfigGenInput } from "./index";

const BASE: Omit<ConfigGenInput, "vendor"> = {
  device: {
    id: "dev1",
    name: "core-sw-01",
    manufacturer: "cisco",
    model: "C9300-48P",
    portCount: 48,
  },
  vlans: [
    { vlanId: 10, name: "Mgmt", description: "", purpose: "management" },
    { vlanId: 20, name: "Users", description: "", purpose: "user" },
    { vlanId: 30, name: "IoT", description: "", purpose: "iot" },
  ],
  assignments: [
    { vlanId: 10, vlanName: "Mgmt", portNumber: 1, mode: "access", tagged: false },
    { vlanId: 20, vlanName: "Users", portNumber: 2, mode: "access", tagged: false },
    { vlanId: 30, vlanName: "IoT", portNumber: 24, mode: "trunk", tagged: true },
    { vlanId: 20, vlanName: "Users", portNumber: 24, mode: "trunk", tagged: true },
    { vlanId: 1, vlanName: "default", portNumber: 24, mode: "native", tagged: false },
  ],
};

describe("compress helpers", () => {
  it("compresses contiguous VLAN IDs into hyphenated ranges", () => {
    expect(compressVlanList([10, 20, 30])).toBe("10,20,30");
    expect(compressVlanList([10, 11, 12, 13])).toBe("10-13");
    expect(compressVlanList([10, 11, 20, 21, 22])).toBe("10-11,20-22");
    expect(compressVlanList([])).toBe("none");
    expect(compressVlanList([5, 5, 5])).toBe("5");
  });

  it("compresses port lists the same way", () => {
    expect(compressPortList([1, 2, 3, 5])).toBe("1-3,5");
    expect(compressPortList([24])).toBe("24");
    expect(compressPortList([])).toBe("");
  });
});

describe("Cisco IOS generator", () => {
  it("emits a vlan database + interface configs", () => {
    const out = generateConfig({ ...BASE, vendor: "cisco-ios" });
    expect(out.vendor).toBe("cisco-ios");
    expect(out.text).toContain("vlan 10");
    expect(out.text).toContain(" name Mgmt");
    expect(out.text).toContain("interface GigabitEthernet0/1");
    expect(out.text).toContain(" switchport mode access");
    expect(out.text).toContain(" switchport access vlan 10");
    expect(out.text).toContain("interface GigabitEthernet0/24");
    expect(out.text).toContain(" switchport mode trunk");
    expect(out.text).toContain(" switchport trunk native vlan 1");
    expect(out.text).toContain(" switchport trunk allowed vlan 1,20,30");
  });

  it("sanitizes VLAN names", () => {
    const out = generateConfig({
      ...BASE,
      vendor: "cisco-ios",
      vlans: [
        { vlanId: 10, name: "Finance Dept", description: "", purpose: "user" },
      ],
      assignments: [],
    });
    expect(out.text).toContain("name Finance_Dept");
  });
});

describe("UniFi generator", () => {
  it("emits JSON with networks + port_overrides", () => {
    const out = generateConfig({ ...BASE, vendor: "unifi" });
    expect(out.vendor).toBe("unifi");
    const parsed = JSON.parse(out.text);
    expect(parsed.networks).toHaveLength(3);
    expect(parsed.networks[0]).toMatchObject({
      vlan: 10,
      name: "Mgmt",
      purpose: "corporate",
      enabled: true,
    });
    const trunkPort = parsed.port_overrides.find(
      (p: { port_idx: number }) => p.port_idx === 24,
    );
    expect(trunkPort.tagged_vlans).toContain(20);
    expect(trunkPort.tagged_vlans).toContain(30);
    expect(trunkPort.native_vlan).toBe(1);
  });
});

describe("HPE Aruba generator", () => {
  it("emits vlan contexts with tagged + untagged port lists", () => {
    const out = generateConfig({ ...BASE, vendor: "hpe-aruba" });
    expect(out.vendor).toBe("hpe-aruba");
    expect(out.text).toContain("vlan 10");
    expect(out.text).toContain('name "Mgmt"');
    expect(out.text).toContain("untagged 1");
    expect(out.text).toContain("vlan 30");
    expect(out.text).toContain("tagged 24");
  });

  it("warns when the same port is untagged on multiple VLANs", () => {
    const out = generateConfig({
      ...BASE,
      vendor: "hpe-aruba",
      assignments: [
        { vlanId: 10, vlanName: "A", portNumber: 1, mode: "access", tagged: false },
        { vlanId: 20, vlanName: "B", portNumber: 1, mode: "access", tagged: false },
      ],
    });
    expect(out.warnings.some((w) => w.includes("Port 1"))).toBe(true);
  });
});

describe("warnings for unported assignments", () => {
  it("flags device-level assignments when Cisco expects per-port", () => {
    const out = generateConfig({
      ...BASE,
      vendor: "cisco-ios",
      assignments: [
        { vlanId: 10, vlanName: "Mgmt", portNumber: null, mode: "trunk", tagged: true },
      ],
    });
    expect(out.warnings.some((w) => w.includes("device-level"))).toBe(true);
  });
});
