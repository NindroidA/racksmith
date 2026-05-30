import { describe, expect, it } from "vitest";
import { serializeConnection } from "./connection";
import { serializeDevice } from "./device";
import { serializeDhcpRange } from "./dhcp-range";
import { serializeIpAssignment } from "./ip-assignment";
import { serializeRack } from "./rack";
import { serializeSubnet } from "./subnet";
import { serializeVlan } from "./vlan";

const ISO = "2026-04-21T10:30:00.000Z";
const createdAt = new Date(ISO);

describe("serializeConnection", () => {
  it("maps every field 1:1 and converts createdAt to an ISO string", () => {
    const out = serializeConnection({
      id: "conn_1",
      sourceDeviceId: "dev_src",
      sourcePort: "Gi0/1",
      targetDeviceId: "dev_tgt",
      targetPort: "Gi0/24",
      cableType: "ethernet",
      cableLengthFt: 3,
      vlan: "10",
      bandwidth: "1G",
      description: "uplink",
      createdAt,
    });

    expect(out).toEqual({
      id: "conn_1",
      sourceDeviceId: "dev_src",
      sourcePort: "Gi0/1",
      targetDeviceId: "dev_tgt",
      targetPort: "Gi0/24",
      cableType: "ethernet",
      cableLengthFt: 3,
      vlan: "10",
      bandwidth: "1G",
      description: "uplink",
      createdAt: ISO,
    });
    expect(typeof out.createdAt).toBe("string");
  });

  it("passes through null optional fields", () => {
    const out = serializeConnection({
      id: "conn_2",
      sourceDeviceId: "a",
      sourcePort: "p1",
      targetDeviceId: "b",
      targetPort: "p2",
      cableType: "fiber",
      cableLengthFt: null,
      vlan: null,
      bandwidth: null,
      description: "",
      createdAt,
    });

    expect(out.cableLengthFt).toBeNull();
    expect(out.vlan).toBeNull();
    expect(out.bandwidth).toBeNull();
    expect(out.description).toBe("");
    expect(out.cableType).toBe("fiber");
  });
});

describe("serializeDevice", () => {
  it("whitelists fields, casts deviceType, and ISO-formats createdAt", () => {
    const out = serializeDevice({
      id: "dev_1",
      name: "core-sw",
      deviceType: "switch",
      manufacturer: "Cisco",
      model: "C9300",
      sizeU: 1,
      portCount: 48,
      powerWatts: 350,
      rackId: "rack_1",
      positionU: 12,
      ipAddress: "10.0.0.2",
      macAddress: "aa:bb:cc:dd:ee:ff",
      hostname: "core-sw.local",
      createdAt,
    });

    expect(out).toEqual({
      id: "dev_1",
      name: "core-sw",
      deviceType: "switch",
      manufacturer: "Cisco",
      model: "C9300",
      sizeU: 1,
      portCount: 48,
      powerWatts: 350,
      rackId: "rack_1",
      positionU: 12,
      ipAddress: "10.0.0.2",
      macAddress: "aa:bb:cc:dd:ee:ff",
      hostname: "core-sw.local",
      createdAt: ISO,
    });
  });

  it("excludes non-whitelisted fields even when present on the row", () => {
    const out = serializeDevice({
      id: "dev_2",
      name: "unracked",
      deviceType: "server",
      manufacturer: "Dell",
      model: "R740",
      sizeU: 2,
      portCount: 4,
      powerWatts: null,
      rackId: null,
      positionU: null,
      ipAddress: null,
      macAddress: null,
      hostname: null,
      createdAt,
      // fields the serializer must drop
      userId: "user_x",
      organizationId: "org_x",
      notes: "secret note",
      isManual: true,
    } as unknown as Parameters<typeof serializeDevice>[0]);

    expect(out).not.toHaveProperty("userId");
    expect(out).not.toHaveProperty("organizationId");
    expect(out).not.toHaveProperty("notes");
    expect(out).not.toHaveProperty("isManual");
    expect(out.powerWatts).toBeNull();
    expect(out.rackId).toBeNull();
    expect(out.positionU).toBeNull();
    expect(out.ipAddress).toBeNull();
    expect(out.macAddress).toBeNull();
    expect(out.hostname).toBeNull();
  });
});

describe("serializeDhcpRange", () => {
  it("is a straight whitelist pass-through with no date conversion", () => {
    const out = serializeDhcpRange({
      id: "dhcp_1",
      subnetId: "sub_1",
      startIp: "10.0.0.100",
      endIp: "10.0.0.200",
      label: "pool-a",
    });

    expect(out).toEqual({
      id: "dhcp_1",
      subnetId: "sub_1",
      startIp: "10.0.0.100",
      endIp: "10.0.0.200",
      label: "pool-a",
    });
    expect(out).not.toHaveProperty("createdAt");
  });
});

describe("serializeIpAssignment", () => {
  it("maps fields 1:1, casts status, and ISO-formats createdAt", () => {
    const out = serializeIpAssignment({
      id: "ip_1",
      subnetId: "sub_1",
      ipAddress: "10.0.0.5",
      deviceId: "dev_1",
      status: "assigned",
      notes: "gateway candidate",
      createdAt,
    });

    expect(out).toEqual({
      id: "ip_1",
      subnetId: "sub_1",
      ipAddress: "10.0.0.5",
      deviceId: "dev_1",
      status: "assigned",
      notes: "gateway candidate",
      createdAt: ISO,
    });
  });

  it("passes through a null deviceId and reserved/dhcp statuses", () => {
    const reserved = serializeIpAssignment({
      id: "ip_2",
      subnetId: "sub_1",
      ipAddress: "10.0.0.1",
      deviceId: null,
      status: "reserved",
      notes: "",
      createdAt,
    });
    expect(reserved.deviceId).toBeNull();
    expect(reserved.status).toBe("reserved");

    const dhcp = serializeIpAssignment({
      id: "ip_3",
      subnetId: "sub_1",
      ipAddress: "10.0.0.150",
      deviceId: null,
      status: "dhcp",
      notes: "",
      createdAt,
    });
    expect(dhcp.status).toBe("dhcp");
  });
});

describe("serializeRack", () => {
  it("renames colorTag to color and ISO-formats createdAt", () => {
    const out = serializeRack({
      id: "rack_1",
      name: "Rack A",
      sizeU: 42,
      location: "DC1 / Row 3",
      colorTag: "blue",
      createdAt,
    });

    expect(out).toEqual({
      id: "rack_1",
      name: "Rack A",
      sizeU: 42,
      location: "DC1 / Row 3",
      color: "blue",
      createdAt: ISO,
    });
    expect(out).not.toHaveProperty("colorTag");
  });

  it("maps an empty-string location to null (nullability boundary)", () => {
    const out = serializeRack({
      id: "rack_2",
      name: "Rack B",
      sizeU: 24,
      location: "",
      colorTag: "purple",
      createdAt,
    });

    expect(out.location).toBeNull();
    expect(out.color).toBe("purple");
  });
});

describe("serializeSubnet", () => {
  it("renames colorTag to color, keeps populated dnsServers, ISO-formats createdAt", () => {
    const out = serializeSubnet({
      id: "sub_1",
      cidr: "10.0.0.0/24",
      name: "mgmt",
      description: "management subnet",
      gateway: "10.0.0.1",
      dnsServers: "1.1.1.1,8.8.8.8",
      colorTag: "cyan",
      vlanId: "vlan_1",
      createdAt,
    });

    expect(out).toEqual({
      id: "sub_1",
      cidr: "10.0.0.0/24",
      name: "mgmt",
      description: "management subnet",
      gateway: "10.0.0.1",
      dnsServers: "1.1.1.1,8.8.8.8",
      color: "cyan",
      vlanId: "vlan_1",
      createdAt: ISO,
    });
    expect(out).not.toHaveProperty("colorTag");
  });

  it("maps empty-string dnsServers to null and passes through null gateway/vlanId", () => {
    const out = serializeSubnet({
      id: "sub_2",
      cidr: "192.168.1.0/24",
      name: "lan",
      description: "",
      gateway: null,
      dnsServers: "",
      colorTag: "green",
      vlanId: null,
      createdAt,
    });

    expect(out.dnsServers).toBeNull();
    expect(out.gateway).toBeNull();
    expect(out.vlanId).toBeNull();
    expect(out.color).toBe("green");
  });
});

describe("serializeVlan", () => {
  it("renames colorTag to color, surfaces numeric vlanId + CUID id, ISO-formats createdAt", () => {
    const out = serializeVlan({
      id: "vlan_cuid_1",
      vlanId: 100,
      name: "voice",
      description: "VoIP traffic",
      colorTag: "orange",
      purpose: "voip",
      createdAt,
    });

    expect(out).toEqual({
      id: "vlan_cuid_1",
      vlanId: 100,
      name: "voice",
      description: "VoIP traffic",
      color: "orange",
      purpose: "voip",
      createdAt: ISO,
    });
    expect(out).not.toHaveProperty("colorTag");
    expect(typeof out.vlanId).toBe("number");
    expect(typeof out.id).toBe("string");
  });
});
