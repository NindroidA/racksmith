import Link from "next/link";
import {
  Stack,
  ShareNetwork,
  Gauge,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import type { UsageSummary } from "@/lib/tiers";
import { roleHasAccess, type Role } from "@/lib/permissions";
import { Tag } from "@/components/ui/tag";

type Props = { usage: UsageSummary; role: Role };

function UsageRow({
  icon: Icon,
  label,
  current,
  limit,
}: {
  icon: typeof Stack;
  label: string;
  current: number;
  limit: number | null;
}) {
  const pct =
    limit === null ? 0 : Math.min(100, Math.round((current / limit) * 100));
  const atLimit = limit !== null && current >= limit;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-sm">
        <Icon className="h-3.5 w-3.5 text-white/50" weight="duotone" />
        <span className="text-white/80">{label}</span>
        <span className="mono ml-auto text-white/60">
          {current}
          {limit !== null ? ` / ${limit}` : " / ∞"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
        {limit !== null && (
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label}: ${current} of ${limit}`}
            className={`h-full rounded-full transition-all ${
              atLimit
                ? "bg-accent-red"
                : pct > 80
                  ? "bg-accent-orange"
                  : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

export function UsageSection({ usage, role }: Props) {
  const atAny =
    (usage.racks.limit !== null && usage.racks.current >= usage.racks.limit) ||
    (usage.sites.limit !== null && usage.sites.current >= usage.sites.limit);
  const canManageBilling = roleHasAccess(role, "admin");

  return (
    <section className="surface-card p-6">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Gauge className="h-4 w-4 text-primary" weight="duotone" />
          Plan &amp; usage
        </h2>
        <Tag tone="info" size="md">
          {usage.planLabel} tier
        </Tag>
      </div>
      <p className="mb-5 text-sm text-white/50">
        Current resource usage on the {usage.planLabel} tier.
      </p>

      <div className="flex flex-col gap-4">
        <UsageRow
          icon={Stack}
          label="Racks"
          current={usage.racks.current}
          limit={usage.racks.limit}
        />
        <UsageRow
          icon={ShareNetwork}
          label="Sites"
          current={usage.sites.current}
          limit={usage.sites.limit}
        />
      </div>

      {atAny && usage.plan === "free" && (
        <div className="mt-5 rounded-lg border border-accent-orange/30 bg-accent-orange/[0.05] p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-accent-orange">
            <span className="led-dot led-dot--amber" aria-hidden />
            <Sparkle className="h-4 w-4" weight="duotone" />
            You&apos;ve hit a Free-tier limit
          </div>
          <p className="text-sm text-white/60">
            Upgrade to Pro ($9/mo) for unlimited sites and racks, team members,
            API access, and PDF/CSV/SVG exports.
          </p>
          {canManageBilling ? (
            <Link
              href="/settings/billing"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Upgrade plan
            </Link>
          ) : (
            <p className="mt-3 text-sm text-white/50">
              Ask an admin or owner of this organization to upgrade the plan.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
