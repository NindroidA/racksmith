import Link from "next/link";
import { Lock, Sparkle, ArrowLeft } from "@phosphor-icons/react/dist/ssr";

type Props = {
  resource: string;
  planLabel: string;
  current: number;
  limit: number;
  /**
   * Where "Back" goes — usually the list page for this resource.
   */
  backHref: string;
  backLabel?: string;
};

export function TierLimitBanner({
  resource,
  planLabel,
  current,
  limit,
  backHref,
  backLabel = "Back",
}: Props) {
  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" weight="bold" />
        {backLabel}
      </Link>

      <div className="surface-card border border-accent-orange/30 bg-accent-orange/[0.04] p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-orange/15">
          <Lock className="h-6 w-6 text-accent-orange" weight="duotone" />
        </div>

        <h1 className="mb-2 text-xl font-semibold text-white">
          You&apos;ve reached the {planLabel} tier {resource} limit
        </h1>
        <p className="mb-6 text-sm text-white/60">
          The {planLabel} tier includes{" "}
          <span className="font-semibold text-white">
            <span className="mono">{limit}</span> {resource}
          </span>
          . You currently have <span className="mono">{current}</span>. Upgrade
          to Pro or Business to unlock unlimited {resource} and team features.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40">
              Pro · <span className="mono">$9/mo</span>
            </div>
            <ul className="mt-2 space-y-1 text-white/70">
              <li>Unlimited sites &amp; racks</li>
              <li>Team members (up to 5)</li>
              <li>API access</li>
              <li>PDF / CSV / SVG exports</li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40">
              Business · <span className="mono">$29/user/mo</span>
            </div>
            <ul className="mt-2 space-y-1 text-white/70">
              <li>Everything in Pro</li>
              <li>Client workspaces</li>
              <li>White-label branding</li>
              <li>SSO (OIDC)</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Sparkle className="h-4 w-4" weight="duotone" />
            Join hosted waitlist
          </Link>
          <Link
            href={backHref}
            className="rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.1]"
          >
            {backLabel}
          </Link>
        </div>

        <p className="mt-5 text-xs text-white/40">
          Paid tiers run on our hosted service at launch. Self-hosted paid
          licensing (signed JWT + instance binding) lands post-v1.
        </p>
      </div>
    </div>
  );
}
