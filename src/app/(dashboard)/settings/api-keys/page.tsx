import Link from "next/link";
import { ArrowLeft, Key, Plus } from "lucide-react";
import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { TIER_LIMITS, getOrganizationPlan } from "@/lib/tiers";
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
          <ArrowLeft className="h-3.5 w-3.5" /> Back to settings
        </Link>
        <div className="glass-card rounded-xl p-8 text-center">
          <Key className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h1 className="mb-2 text-xl font-semibold text-white">
            API access requires a paid plan
          </h1>
          <p className="mb-4 text-sm text-white/60">
            Upgrade to Pro or Business to create API keys and integrate
            RackSmith with your tooling.
          </p>
          <Link
            href="/settings/billing"
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
        <ArrowLeft className="h-3.5 w-3.5" /> Back to settings
      </Link>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
            <Key className="h-6 w-6 text-primary" /> API keys
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Using {activeCount} of {limits.apiKeyMax} keys on your {limits.label} plan.
          </p>
        </div>
        <ApiKeyCreateDialog disabled={activeCount >= limits.apiKeyMax} />
      </div>

      {keys.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Plus className="mx-auto mb-3 h-8 w-8 text-white/40" />
          <p className="mb-4 text-sm text-white/60">No API keys yet.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-xl">
          <table className="w-full text-sm">
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
                  <td className="px-4 py-3 font-mono text-xs text-white/70">{k.prefix}…</td>
                  <td className="px-4 py-3 text-white/70">{k.role}</td>
                  <td className="px-4 py-3 text-xs text-white/50">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/50">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {k.revokedAt ? (
                      <span className="text-accent-red">Revoked</span>
                    ) : k.expiresAt && k.expiresAt.getTime() < Date.now() ? (
                      <span className="text-white/40">Expired</span>
                    ) : (
                      <span className="text-accent-green">Active</span>
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
      )}
    </div>
  );
}
