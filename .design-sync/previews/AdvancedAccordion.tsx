import { AdvancedAccordion } from "racksmith";

export const Expanded = () => (
  <div style={{ maxWidth: 420 }}>
    <AdvancedAccordion label="Advanced options" defaultOpen>
      <label className="block text-sm text-white/70">
        Power draw (W)
        <input
          className="glass-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
          defaultValue="650"
        />
      </label>
      <label className="block text-sm text-white/70">
        Rack units (U)
        <input
          className="glass-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
          defaultValue="2"
        />
      </label>
    </AdvancedAccordion>
  </div>
);

export const Collapsed = () => (
  <div style={{ maxWidth: 420 }}>
    <AdvancedAccordion label="Advanced options">
      <p className="text-sm text-white/60">Hidden until expanded.</p>
    </AdvancedAccordion>
  </div>
);
