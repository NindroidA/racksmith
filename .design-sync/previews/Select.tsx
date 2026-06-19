import { Select, SelectOption } from "racksmith";

export const Default = () => (
  <div style={{ maxWidth: 320 }}>
    <Select value="switch" onValueChange={() => {}} aria-label="Device type">
      <SelectOption value="switch">Switch</SelectOption>
      <SelectOption value="router">Router</SelectOption>
      <SelectOption value="server">Server</SelectOption>
      <SelectOption value="firewall">Firewall</SelectOption>
    </Select>
  </div>
);

export const Placeholder = () => (
  <div style={{ maxWidth: 320 }}>
    <Select
      value=""
      onValueChange={() => {}}
      placeholder="Select device type…"
      aria-label="Device type"
    >
      <SelectOption value="switch">Switch</SelectOption>
      <SelectOption value="router">Router</SelectOption>
    </Select>
  </div>
);

export const Disabled = () => (
  <div style={{ maxWidth: 320 }}>
    <Select value="server" onValueChange={() => {}} disabled aria-label="Device type">
      <SelectOption value="server">Server</SelectOption>
    </Select>
  </div>
);
