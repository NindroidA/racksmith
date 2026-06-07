import Link from "next/link";
import { ArrowLeft, Key, Plus } from "@phosphor-icons/react/dist/ssr";
import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TIER_LIMITS, getOrganizationPlan } from "@/lib/tiers";
import { Tag } from "@/components/ui/tag";
import { ApiKeyCreateDialog } from "./api-key-create-dialog";
import { RevokeKeyButton } from "./revoke-key-button";

export default async function ApiKeysPage() {
  const { organizationId } = await requireMember("admin");
  const plan = await getOrganizationPlan(organizationId);
  const limits = TIER_LIMITS[plan];

  if (!limits.apiAccess) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" weight="bold" /> Back to settings
        </Link>
        <div className="surface-card p-8 text-center">
          <Key className="mx-auto mb-3 h-8 w-8 text-primary" weight="duotone" />
          <h1 className="mb-2 text-xl font-semibold text-white">
            API access requires a paid plan
          </h1>
          <p className="mb-4 text-sm text-white/60">
            Upgrade to Pro or Business to create API keys and integrate
            RackSmith with your tooling.
          </p>
          <Link
            href="/#pricing"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Upgrade
          </Link>
        </div>
      </div>
    );
  }

  const keys = await prisma.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });
  const activeCount = keys.filter((k) => !k.revokedAt).length;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" weight="bold" /> Back to settings
      </Link>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
            <Key className="h-6 w-6 text-primary" weight="duotone" /> API keys
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Using <span className="mono">{activeCount}</span> of{" "}
            <span className="mono">{limits.apiKeyMax}</span> keys on your{" "}
            {limits.label} plan.
          </p>
        </div>
        <ApiKeyCreateDialog disabled={activeCount >= limits.apiKeyMax} />
      </div>

      {keys.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <Plus className="mx-auto mb-3 h-8 w-8 text-white/40" weight="bold" />
          <p className="mb-4 text-sm text-white/60">No API keys yet.</p>
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-white/40">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Prefix</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Last used</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white">{k.name}</td>
                    <td className="px-4 py-3 text-xs text-white/70">
                      <span className="mono">{k.prefix}</span>…
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      <span className="mono">{k.role}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      <span className="mono">
                        {new Date(k.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {k.lastUsedAt ? (
                        <span className="mono">
                          {new Date(k.lastUsedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {k.revokedAt ? (
                        <Tag
                          tone="danger"
                          variant="subtle"
                          iconLeft={
                            <span
                              className="led-dot led-dot--red"
                              aria-hidden
                            />
                          }
                        >
                          Revoked
                        </Tag>
                      ) : k.expiresAt && k.expiresAt.getTime() < Date.now() ? (
                        <Tag
                          tone="neutral"
                          variant="subtle"
                          iconLeft={
                            <span
                              className="led-dot led-dot--muted"
                              aria-hidden
                            />
                          }
                        >
                          Expired
                        </Tag>
                      ) : (
                        <Tag
                          tone="success"
                          variant="subtle"
                          iconLeft={
                            <span
                              className="led-dot led-dot--green"
                              aria-hidden
                            />
                          }
                        >
                          Active
                        </Tag>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!k.revokedAt && (
                        <RevokeKeyButton keyId={k.id} keyName={k.name} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
