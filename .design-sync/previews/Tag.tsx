import { Tag } from "racksmith";

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
    {children}
  </div>
);

export const Tones = () => (
  <Row>
    <Tag tone="neutral">Neutral</Tag>
    <Tag tone="info">Online</Tag>
    <Tag tone="success">Healthy</Tag>
    <Tag tone="warning">Degraded</Tag>
    <Tag tone="danger">Offline</Tag>
    <Tag tone="accent">Core</Tag>
  </Row>
);

export const Subtle = () => (
  <Row>
    <Tag tone="neutral" variant="subtle">VLAN 10</Tag>
    <Tag tone="info" variant="subtle">DHCP</Tag>
    <Tag tone="success" variant="subtle">Up</Tag>
    <Tag tone="warning" variant="subtle">PoE</Tag>
    <Tag tone="danger" variant="subtle">Down</Tag>
    <Tag tone="accent" variant="subtle">Trunk</Tag>
  </Row>
);

export const Sizes = () => (
  <Row>
    <Tag size="sm" tone="info">sm — 18px</Tag>
    <Tag size="md" tone="info">md — 22px</Tag>
  </Row>
);
