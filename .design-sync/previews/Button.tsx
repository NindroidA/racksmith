import { Button } from "racksmith";
import { Plus, ArrowRight, Trash } from "@phosphor-icons/react/dist/ssr";

export const Variants = () => (
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
    <Button variant="primary">Add device</Button>
    <Button variant="secondary">Cancel</Button>
    <Button variant="ghost">Skip</Button>
    <Button variant="danger">Delete rack</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
  </div>
);

export const WithIcons = () => (
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
    <Button iconLeft={<Plus weight="bold" />}>New rack</Button>
    <Button variant="secondary" iconRight={<ArrowRight weight="bold" />}>
      Continue
    </Button>
    <Button variant="danger" iconLeft={<Trash weight="bold" />}>
      Remove
    </Button>
  </div>
);

export const States = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Button disabled>Disabled</Button>
    <Button loading>Saving</Button>
    <Button variant="secondary" loading>
      Loading
    </Button>
  </div>
);
