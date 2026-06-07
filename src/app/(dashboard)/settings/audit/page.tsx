import Link from "next/link";
import {
  ArrowLeft,
  DownloadSimple,
  FileText,
} from "@phosphor-icons/react/dist/ssr";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { AuditFilters } from "./audit-filters";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  placed: "Placed in rack",
  unplaced: "Removed from rack",
  moved: "Moved",
  signed_in: "Signed in",
  signed_out: "Signed out",
  password_changed: "Changed password",
  "2fa_enabled": "Enabled 2FA",
  "2fa_disabled": "Disabled 2FA",
  email_changed: "Changed email",
  scan_started: "Started scan",
  scan_completed: "Completed scan",
  scan_cancelled: "Cancelled scan",
  device_imported: "Imported devices",
  device_discovered: "Discovered device",
  invitation_accepted: "Accepted invitation",
  invitation_declined: "Declined invitation",
  ownership_transfer_requested: "Requested ownership transfer",
  ownership_transfer_accepted: "Accepted ownership transfer",
  ownership_transfer_declined: "Declined ownership transfer",
  ownership_transfer_revoked: "Revoked ownership transfer",
  api_key_created: "Created API key",
  api_key_revoked: "Revoked API key",
  api_key_auto_revoked: "Auto-revoked API key (member removed)",
};

const ACTION_COLORS: Record<string, string> = {
  created: "text-accent-green",
  updated: "text-primary",
  deleted: "text-accent-red",
  placed: "text-accent-cyan",
  unplaced: "text-white/60",
  device_discovered: "text-accent-purple",
};

type SearchParams = { [k: string]: string | string[] | undefined };

function readStr(p: SearchParams, key: string): string | undefined {
  const v = p[key];
  return typeof v === "string" ? v : undefined;
}

function readNum(p: SearchParams, key: string, fallback: number): number {
  const v = p[key];
  if (typeof v !== "string") return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { organizationId } = await requireMember("member");
  const params = await searchParams;

  const actionFilter = readStr(params, "action") || "";
  const entityFilter = readStr(params, "entity") || "";
  const page = readNum(params, "page", 0);

  const where = {
    organizationId,
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(entityFilter ? { entityType: entityFilter } : {}),
  };

  const [logs, total] = await withTenant(organizationId, (tx) =>
    Promise.all([
      tx.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      tx.auditLog.count({ where }),
    ]),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportQs = new URLSearchParams();
  if (actionFilter) exportQs.set("action", actionFilter);
  if (entityFilter) exportQs.set("entity", entityFilter);
  const exportUrl = `/api/audit/export${exportQs.toString() ? "?" + exportQs : ""}`;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" weight="bold" />
        Back to settings
      </Link>

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
            <FileText className="h-6 w-6 text-primary" weight="duotone" />
            Audit log
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Every change made to your account, racks, devices, and topology.{" "}
            <span className="text-white/40">
              <span className="mono">{total.toLocaleString()}</span> events
            </span>
          </p>
        </div>
        <a
          href={exportUrl}
          className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.1]"
        >
          <DownloadSimple className="h-4 w-4" weight="bold" />
          Export CSV
        </a>
      </div>

      <AuditFilters
        actionFilter={actionFilter}
        entityFilter={entityFilter}
        actionLabels={ACTION_LABELS}
      />

      {logs.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <p className="text-sm text-white/50">
            No events match these filters yet.
          </p>
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Audit log entries</caption>
              <thead>
                <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/40">
                  <th className="px-4 py-3 text-left font-medium">When</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Entity</th>
                  <th className="px-4 py-3 text-left font-medium">Details</th>
                  <th className="px-4 py-3 text-left font-medium">From</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {logs.map((log) => {
                  const meta = (log.metadata ?? {}) as Record<string, unknown>;
                  const ip =
                    typeof meta.ipAddress === "string" ? meta.ipAddress : "—";
                  const changes = log.changes as Record<string, unknown> | null;
                  const colorClass =
                    ACTION_COLORS[log.action] ?? "text-white/70";
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-white/50">
                        <span className="mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 font-medium ${colorClass}`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-white/70">
                        {log.entityType.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/50">
                        {changes
                          ? truncate(
                              Object.entries(changes)
                                .map(([k, v]) => `${k}=${formatValue(v)}`)
                                .join(", "),
                              80,
                            )
                          : "—"}
                      </td>
                      <td className="mono whitespace-nowrap px-4 py-3 text-xs text-white/40">
                        {ip}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-white/50">
          <span>
            Page <span className="mono">{page + 1}</span> of{" "}
            <span className="mono">{totalPages}</span>
          </span>
          <div className="flex gap-2">
            {page > 0 && (
              <Link
                href={buildPageUrl(actionFilter, entityFilter, page - 1)}
                className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-white/70 hover:bg-white/[0.1]"
              >
                Previous
              </Link>
            )}
            {page < totalPages - 1 && (
              <Link
                href={buildPageUrl(actionFilter, entityFilter, page + 1)}
                className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-white/70 hover:bg-white/[0.1]"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function buildPageUrl(action: string, entity: string, page: number): string {
  const qs = new URLSearchParams();
  if (action) qs.set("action", action);
  if (entity) qs.set("entity", entity);
  if (page > 0) qs.set("page", String(page));
  return `/settings/audit${qs.toString() ? "?" + qs : ""}`;
}

function formatValue(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
