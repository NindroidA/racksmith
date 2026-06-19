import { ColorTagPicker } from "racksmith";

export const Default = () => (
  <div style={{ maxWidth: 440 }}>
    <ColorTagPicker value="blue" onChange={() => {}} label="Rack color" />
  </div>
);

export const Preselected = () => (
  <div style={{ maxWidth: 440 }}>
    <ColorTagPicker value="purple" onChange={() => {}} label="VLAN tag color" />
  </div>
);
