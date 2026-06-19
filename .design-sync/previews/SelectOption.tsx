import { Select, SelectOption } from "racksmith";

// SelectOption renders nothing on its own (it registers option metadata with its
// parent <Select>), so its preview is the full composition — a <Select> whose
// options include a disabled one. The selected option's label shows in the
// trigger; the open listbox is interaction-driven and not captured statically.
export const InSelect = () => (
  <div style={{ maxWidth: 320 }}>
    <Select value="1g" onValueChange={() => {}} aria-label="Link speed">
      <SelectOption value="100m">100 Mbps</SelectOption>
      <SelectOption value="1g">1 GbE</SelectOption>
      <SelectOption value="10g">10 GbE</SelectOption>
      <SelectOption value="40g" disabled>
        40 GbE (unavailable)
      </SelectOption>
    </Select>
  </div>
);
