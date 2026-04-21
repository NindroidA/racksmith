export type SubnetLite = {
  id: string;
  cidr: string;
  name: string;
  gateway: string | null;
  dnsServers: string;
};

export type SubnetDetails = {
  kind: "ipv4" | "ipv6";
  prefix: number;
  network: string;
  broadcast: string | null;
  firstUsable: string | null;
  lastUsable: string | null;
  totalHosts: string;
  usableHosts: string;
};

export type AssignmentLite = {
  id: string;
  ipAddress: string;
  status: string;
  notes: string;
  device: { id: string; name: string; deviceType: string } | null;
};

export type DhcpRangeLite = {
  id: string;
  startIp: string;
  endIp: string;
  label: string;
};

export type DeviceLite = { id: string; name: string; deviceType: string };
