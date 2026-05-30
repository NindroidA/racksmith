import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PencilSimple,
  ArrowLeft,
  Stack,
  Cpu,
  Lightning,
  ShareNetwork,
  HardDrives,
  Tag as TagIcon,
  MapPin,
  Broadcast,
} from "@phosphor-icons/react/dist/ssr";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { DeviceGraphic, U_ASPECT } from "@/components/rack/device-graphic";
import { DEVICE_TYPE_LABELS } from "@/types";
import type { DeviceType } from "@/types";

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId } = await requireMember("member");

  const device = await withTenant(organizationId, (tx) =>
    tx.device.findFirst({
      where: { id, organizationId },
      include: {
        rack: { select: { id: true, name: true, sizeU: true } },
        sourceConnections: {
          include: { targetDevice: { select: { id: true, name: true } } },
        },
        targetConnections: {
          include: { sourceDevice: { select: { id: true, name: true } } },
        },
      },
    }),
  );

  if (!device) notFound();

  const typeLabel =
    DEVICE_TYPE_LABELS[device.deviceType as DeviceType] || device.deviceType;
  const topU = device.positionU ? device.positionU + device.sizeU - 1 : null;

  const specs = [
    { icon: Stack, label: "Type", value: typeLabel },
    {
      icon: TagIcon,
      label: "Manufacturer",
      value: device.manufacturer || "—",
    },
    { icon: Cpu, label: "Model", value: device.model || "—" },
    { icon: HardDrives, label: "Size", value: `${device.sizeU}U`, mono: true },
    {
      icon: ShareNetwork,
      label: "Ports",
      value: device.portCount > 0 ? String(device.portCount) : "—",
      mono: device.portCount > 0,
    },
    {
      icon: Lightning,
      label: "Power",
      value: device.powerWatts != null ? `${device.powerWatts}W` : "—",
      mono: device.powerWatts != null,
    },
  ];

  const networkInfo = [
    { label: "IP Address", value: device.ipAddress, mono: true },
    { label: "MAC Address", value: device.macAddress, mono: true },
    { label: "Hostname", value: device.hostname, mono: true },
  ].filter((x) => x.value);

  const connections = [
    ...device.sourceConnections.map((c) => ({
      id: c.id,
      peer: c.targetDevice,
      port: c.sourcePort,
      peerPort: c.targetPort,
      cable: c.cableType,
    })),
    ...device.targetConnections.map((c) => ({
      id: c.id,
      peer: c.sourceDevice,
      port: c.targetPort,
      peerPort: c.sourcePort,
      cable: c.cableType,
    })),
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/devices"
        className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" weight="bold" />
        All Devices
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">
            {typeLabel}
          </div>
          <h1 className="truncate text-3xl font-bold text-white">
            {device.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-white/60">
            {device.manufacturer && (
              <span>
                {device.manufacturer}
                {device.model && ` · ${device.model}`}
              </span>
            )}
            <span className="mono">{device.sizeU}U</span>
            {device.rack && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" weight="duotone" />
                {device.rack.name}
                {device.positionU != null && (
                  <span className="mono">
                    {" "}
                    · U
                    {device.positionU === topU
                      ? device.positionU
                      : `${device.positionU}-${topU}`}
                  </span>
                )}
              </span>
            )}
            {!device.isManual && (
              <span className="flex items-center gap-1.5 text-accent-cyan">
                <Broadcast className="h-3.5 w-3.5" weight="duotone" />
                Auto-discovered
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/devices/${device.id}/edit`}
          className="glass-button flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
        >
          <PencilSimple className="h-4 w-4" weight="bold" />
          Edit
        </Link>
      </div>

      {/* Hero DeviceGraphic */}
      <div className="mb-6 surface-card p-6">
        <div
          className="mx-auto overflow-hidden rounded-xl bg-black/40 p-3"
          style={{
            maxWidth: "720px",
            aspectRatio: `${U_ASPECT} / ${device.sizeU}`,
          }}
        >
          <DeviceGraphic
            deviceType={device.deviceType}
            manufacturer={device.manufacturer || "custom"}
            model={device.model}
            sizeU={device.sizeU}
            portCount={device.portCount}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
        {/* Specs + Notes */}
        <div className="space-y-6">
          <section className="surface-card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
              Specifications
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {specs.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label}>
                    <div className="mb-1 flex items-center gap-1.5 text-xs text-white/50">
                      <Icon className="h-3.5 w-3.5" weight="duotone" />
                      {s.label}
                    </div>
                    <div
                      className={`text-sm font-medium text-white ${
                        s.mono ? "mono" : ""
                      }`}
                    >
                      {s.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {device.notes && (
            <section className="surface-card p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
                Notes
              </h2>
              <p className="whitespace-pre-wrap text-sm text-white/80">
                {device.notes}
              </p>
            </section>
          )}

          {/* Connections (placeholder for Phase 5 topology) */}
          <section className="surface-card p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
              Connections (<span className="mono">{connections.length}</span>)
            </h2>
            {connections.length === 0 ? (
              <p className="text-sm text-white/40">
                No connections yet. Use the topology view to wire devices
                together.
              </p>
            ) : (
              <ul className="space-y-2">
                {connections.map((c) => (
                  <li
                    key={c.id}
                    aria-label={`Connected to ${c.peer.name} via ${c.cable}${c.port ? ` from port ${c.port}` : ""}${c.peerPort ? ` to peer port ${c.peerPort}` : ""}`}
                    className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <Link
                      href={`/devices/${c.peer.id}`}
                      className="text-white hover:text-primary"
                    >
                      {c.peer.name}
                    </Link>
                    <span aria-hidden className="mono text-xs text-white/50">
                      {c.port || "—"} → {c.peerPort || "—"} · {c.cable}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Side panel: rack + network */}
        <aside className="space-y-6">
          {device.rack ? (
            <section className="surface-card p-5">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-white/50">
                <MapPin className="h-3.5 w-3.5" weight="duotone" />
                Rack Position
              </h2>
              <Link
                href={`/racks/${device.rack.id}`}
                aria-label={`View rack: ${device.rack.name}`}
                className="block rounded-lg bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
              >
                <div className="text-sm font-medium text-white">
                  {device.rack.name}
                </div>
                <div className="mono mt-1 text-xs text-white/60">
                  {device.positionU != null
                    ? device.positionU === topU
                      ? `U${device.positionU} of ${device.rack.sizeU}U`
                      : `U${device.positionU}-${topU} of ${device.rack.sizeU}U`
                    : `${device.rack.sizeU}U rack`}
                </div>
              </Link>
            </section>
          ) : (
            <section className="surface-card p-5">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-white/50">
                <MapPin className="h-3.5 w-3.5" weight="duotone" />
                Rack Position
              </h2>
              <p className="text-sm text-white/50">
                Unracked. Edit the device to place it in a rack.
              </p>
            </section>
          )}

          {networkInfo.length > 0 && (
            <section className="surface-card p-5">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-white/50">
                <ShareNetwork className="h-3.5 w-3.5" weight="duotone" />
                Network
              </h2>
              <dl className="space-y-3">
                {networkInfo.map((info) => (
                  <div key={info.label}>
                    <dt className="text-xs text-white/50">{info.label}</dt>
                    <dd
                      className={`text-sm text-white ${
                        info.mono ? "mono" : ""
                      }`}
                    >
                      {info.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {!device.isManual && (device.discoveredAt || device.lastSeen) && (
            <section className="surface-card p-5">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-white/50">
                <Broadcast className="h-3.5 w-3.5" weight="duotone" />
                Discovery
              </h2>
              <dl className="space-y-3">
                {device.discoveredAt && (
                  <div>
                    <dt className="text-xs text-white/50">Discovered</dt>
                    <dd className="mono text-sm text-white">
                      {device.discoveredAt.toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                )}
                {device.lastSeen && (
                  <div>
                    <dt className="text-xs text-white/50">Last Seen</dt>
                    <dd className="mono text-sm text-white">
                      {device.lastSeen.toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </dd>
                  </div>
                )}
                {device.osFingerprint && (
                  <div>
                    <dt className="text-xs text-white/50">OS</dt>
                    <dd className="text-sm text-white">
                      {device.osFingerprint}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
