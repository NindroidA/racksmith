import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowDown,
  ArrowUp,
  Radar,
  Server,
  HardDrive,
  Network,
  Activity,
} from "lucide-react";
import { withTenant } from "@/lib/prisma-tenant";

const ACTION_LABELS: Record<string, { verb: string; icon: typeof Plus }> = {
  created: { verb: "Created", icon: Plus },
  updated: { verb: "Updated", icon: Pencil },
  deleted: { verb: "Deleted", icon: Trash2 },
  placed: { verb: "Placed", icon: ArrowDown },
  unplaced: { verb: "Removed from rack", icon: ArrowUp },
  device_discovered: { verb: "Discovered", icon: Radar },
  device_imported: { verb: "Imported devices", icon: HardDrive },
};

const ENTITY_ICONS: Record<string, typeof Server> = {
  rack: Server,
  device: HardDrive,
  connection: Network,
  discovery_scan: Radar,
};

function relativeTime(date: Date): string {
  const diffSec = (Date.now() - date.getTime()) / 1000;
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString();
}

function entityHref(
  entityType: string,
  entityId: string | null,
): string | null {
  if (!entityId) return null;
  switch (entityType) {
    case "rack":
      return `/racks/${entityId}`;
    case "device":
      return `/devices/${entityId}`;
    case "discovery_scan":
      return "/discovery";
    case "connection":
      return "/topology";
    default:
      return null;
  }
}

function describe(log: {
  action: string;
  entityType: string;
  changes: unknown;
}): string {
  const changes = (log.changes ?? {}) as Record<string, unknown>;
  if (typeof changes.name === "string" && changes.name) return changes.name;
  if (log.entityType === "device" && typeof changes.model === "string")
    return `${changes.manufacturer ?? ""} ${changes.model}`.trim();
  if (log.entityType === "connection") return "topology link";
  return log.entityType.replace(/_/g, " ");
}

export async function ActivityFeed({
  organizationId,
}: {
  organizationId: string;
}) {
  const logs = await withTenant(organizationId, (tx) =>
    tx.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  );

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Activity className="h-4 w-4 text-primary" />
          Recent activity
        </h2>
        {logs.length > 0 && (
          <Link
            href="/settings/audit"
            className="text-xs text-white/50 transition-colors hover:text-white"
          >
            View all →
          </Link>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-sm text-white/60">
            No activity yet. Start by{" "}
            <Link href="/racks/new" className="text-primary hover:underline">
              adding a rack
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="glass-card divide-y divide-white/[0.04] overflow-hidden rounded-xl">
          {logs.map((log) => {
            const meta = ACTION_LABELS[log.action] ?? {
              verb: log.action,
              icon: Activity,
            };
            const Icon = meta.icon;
            const EntityIcon = ENTITY_ICONS[log.entityType] ?? Activity;
            const href = entityHref(log.entityType, log.entityId);
            const detail = describe(log);

            const inner = (
              <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                  <Icon className="h-3.5 w-3.5 text-white/60" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white/80">
                    <span className="font-medium text-white">{meta.verb}</span>{" "}
                    <span className="text-white/50">·</span>{" "}
                    <span className="inline-flex items-center gap-1 text-white/70">
                      <EntityIcon className="h-3 w-3" />
                      {log.entityType.replace(/_/g, " ")}
                    </span>
                    {detail && (
                      <span className="ml-2 truncate text-white/50">
                        {detail}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-white/40">
                  {relativeTime(log.createdAt)}
                </div>
              </div>
            );

            return (
              <li key={log.id}>
                {href ? (
                  <Link href={href} className="block">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
