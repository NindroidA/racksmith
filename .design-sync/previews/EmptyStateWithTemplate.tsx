import { EmptyStateWithTemplate } from "racksmith";
import { HardDrives, Cpu } from "@phosphor-icons/react/dist/ssr";

export const Default = () => (
  <div style={{ maxWidth: 560 }}>
    <EmptyStateWithTemplate
      icon={<HardDrives className="h-7 w-7" weight="duotone" />}
      title="No racks yet"
      blurb="Start from a template tuned for homelabs and small server rooms, or build an empty rack from scratch."
      templateLabel="Start from template"
      onStartFromTemplate={() => {}}
      blankHref="#"
      blankLabel="Start blank"
    />
  </div>
);

export const WithSecondaryLink = () => (
  <div style={{ maxWidth: 560 }}>
    <EmptyStateWithTemplate
      icon={<Cpu className="h-7 w-7" weight="duotone" />}
      iconClassName="bg-accent-purple/20 text-accent-purple"
      title="No devices in this rack"
      blurb="Add your first device from the catalog, import from CSV, or scan your network with auto-discovery."
      templateLabel="Browse catalog"
      onStartFromTemplate={() => {}}
      blankHref="#"
      blankLabel="Add manually"
      secondaryHref="#"
      secondaryLabel="Run discovery"
    />
  </div>
);
