import { Tooltip } from "racksmith";

// The hover/focus bubble is interaction-driven and not captured statically; these
// stories show the inline term affordance (dotted underline + question glyph) as it
// appears at rest in body copy.
export const Term = () => (
  <p
    className="text-sm text-white/80"
    style={{ maxWidth: 440, lineHeight: 2 }}
  >
    Assign the port to a <Tooltip term="VLAN" /> and choose a{" "}
    <Tooltip term="CIDR" /> for the subnet. Off-subnet traffic leaves through the{" "}
    <Tooltip term="GATEWAY" />.
  </p>
);

export const CustomContent = () => (
  <Tooltip content={<span className="text-xs text-white/80">Last seen 2 minutes ago</span>}>
    <span className="mono text-sm text-accent-blue underline decoration-dotted underline-offset-2">
      core-sw-01
    </span>
  </Tooltip>
);
