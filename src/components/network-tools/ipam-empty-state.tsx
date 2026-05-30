"use client";

import { ShareNetwork } from "@phosphor-icons/react/dist/ssr";
import { EmptyStateWithTemplate } from "@/components/ui/empty-state-with-template";

export function IpamEmptyState() {
  return (
    <EmptyStateWithTemplate
      icon={<ShareNetwork className="h-8 w-8" weight="duotone" />}
      iconClassName="bg-accent-cyan/20 text-accent-cyan"
      title="No subnets yet"
      blurb="Track the networks your infrastructure lives on. Start with one — your LAN, a VLAN, a client site — and grow from there."
      blankHref="/ipam/new"
      blankLabel="Add subnet"
      secondaryHref="/network-tools/subnet-calc"
      secondaryLabel="Open subnet calculator"
    />
  );
}
