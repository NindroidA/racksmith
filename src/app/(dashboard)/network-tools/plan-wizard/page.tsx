import Link from "next/link";
import { Plus, Wand2, ArrowRight, Check, Trash2 } from "lucide-react";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { canCreatePlan } from "@/lib/tiers";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function PlanWizardListPage({ searchParams }: PageProps) {
  const { organizationId } = await requireMember("member");
  const params = (await searchParams) ?? {};
  const errorMessage = typeof params.error === "string" ? params.error : null;
  const [plans, tier] = await Promise.all([
    withTenant(organizationId, (tx) =>
      tx.buildPlan.findMany({
        where: { organizationId },
        orderBy: [{ updatedAt: "desc" }],
        select: {
          id: true,
          name: true,
          status: true,
          appliedAt: true,
          updatedAt: true,
        },
      }),
    ),
    canCreatePlan(organizationId),
  ]);

  return (
    <div>
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Plan wizard</h1>
          <p className="mt-1 text-sm text-white/60">
            Build a new network from a guided form, then materialize racks,
            devices, VLANs, and subnets in one transaction.
          </p>
        </div>
        {tier.ok ? (
          <Link
            href="/network-tools/plan-wizard/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            <Plus className="h-4 w-4" aria-hidden /> New plan
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title={tier.reason}
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-primary/40 px-4 py-2.5 text-sm font-medium text-white/70"
          >
            <Plus className="h-4 w-4" aria-hidden /> New plan
          </button>
        )}
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-100/90"
        >
          {errorMessage}
        </div>
      )}

      {!tier.ok && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-100/90">
          {tier.reason}{" "}
          <Link href="/settings" className="underline hover:no-underline">
            View plan
          </Link>
        </div>
      )}

      {plans.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {plans.map((p) => (
            <li
              key={p.id}
              className="glass-card flex items-center gap-4 rounded-xl p-5"
            >
              <div className="rounded-lg bg-primary/15 p-3">
                <Wand2 className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/network-tools/plan-wizard/${p.id}`}
                  className="font-medium text-white hover:underline"
                >
                  {p.name}
                </Link>
                <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
                  <StatusBadge status={p.status} />
                  <span>·</span>
                  <span>updated {p.updatedAt.toLocaleString()}</span>
                  {p.appliedAt && (
                    <>
                      <span>·</span>
                      <span>applied {p.appliedAt.toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
              <Link
                href={`/network-tools/plan-wizard/${p.id}`}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80 hover:bg-white/[0.08]"
              >
                Open <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card rounded-xl p-12 text-center">
      <Wand2 className="mx-auto mb-4 h-10 w-10 text-primary" aria-hidden />
      <h2 className="text-lg font-semibold text-white">No plans yet</h2>
      <p className="mt-1 text-sm text-white/60">
        Start a new plan to size racks, switches, VLANs, and IPs in one flow.
      </p>
      <Link
        href="/network-tools/plan-wizard/new"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Create your first plan
      </Link>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "applied") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-accent-green/[0.12] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-green">
        <Check className="h-2.5 w-2.5" aria-hidden /> applied
      </span>
    );
  }
  if (status === "discarded") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
        <Trash2 className="h-2.5 w-2.5" aria-hidden /> discarded
      </span>
    );
  }
  return (
    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
      draft
    </span>
  );
}
