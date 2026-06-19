import { TemplateGallery } from "racksmith";
import { DarkBackdrop } from "./_capture";

const TEMPLATES = [
  { id: "homelab", name: "Homelab Starter", blurb: "12U rack with a managed switch, NAS, and mini-PC server." },
  { id: "msp", name: "MSP Edge", blurb: "Firewall, core switch, and patch panel for a client site." },
  { id: "colo", name: "Colo Half-Rack", blurb: "21U with redundant PDUs and top-of-rack switching." },
  { id: "blank", name: "Blank Rack", blurb: "Start from an empty 42U rack and add devices yourself." },
];

export const Default = () => (
  <>
    <DarkBackdrop />
    <TemplateGallery
      open
      onOpenChange={() => {}}
      onSelect={() => {}}
      title="Choose a rack template"
      subtitle="Pre-built layouts for common homelab and small-team setups"
      items={TEMPLATES}
    />
  </>
);
