import { InlineHelp } from "racksmith";

export const WithTerm = () => (
  <div style={{ maxWidth: 360 }}>
    <InlineHelp htmlFor="vlan" term="VLAN">
      VLAN ID
    </InlineHelp>
    <input
      id="vlan"
      className="glass-input w-full rounded-lg px-3 py-2 text-sm"
      defaultValue="10"
    />
  </div>
);

export const Required = () => (
  <div style={{ maxWidth: 360 }}>
    <InlineHelp htmlFor="rack-name" required>
      Rack name
    </InlineHelp>
    <input
      id="rack-name"
      className="glass-input w-full rounded-lg px-3 py-2 text-sm"
      defaultValue="Rack A1 — Core"
    />
  </div>
);

export const WithHelp = () => (
  <div style={{ maxWidth: 360 }}>
    <InlineHelp
      htmlFor="poe"
      help={<span className="text-xs">Total PoE power budget shared across all switch ports.</span>}
    >
      PoE budget (W)
    </InlineHelp>
    <input
      id="poe"
      className="glass-input w-full rounded-lg px-3 py-2 text-sm"
      defaultValue="370"
    />
  </div>
);
