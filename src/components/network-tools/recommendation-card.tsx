"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  AlertTriangle,
  Info,
  ShieldAlert,
  X,
  Clock,
  ExternalLink,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import toast from "react-hot-toast";
import {
  dismissRecommendation,
  undismissRecommendation,
} from "@/app/(dashboard)/network-tools/recommendations/actions";
import type { Recommendation, Severity } from "@/lib/recommendations/types";

type SevMeta = {
  border: string;
  bg: string;
  icon: typeof AlertTriangle;
  iconColor: string;
  label: string;
  // Visible severity pill text — matches WCAG 1.4.1 (don't use color alone).
  pillClass: string;
};

const SEV_META: Record<Severity, SevMeta> = {
  critical: {
    border: "border-l-red-500",
    bg: "bg-red-500/[0.04]",
    icon: ShieldAlert,
    iconColor: "text-red-400",
    label: "Critical",
    pillClass: "bg-red-500/15 text-red-200",
  },
  warning: {
    border: "border-l-amber-500",
    bg: "bg-amber-500/[0.04]",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    label: "Warning",
    pillClass: "bg-amber-500/15 text-amber-200",
  },
  info: {
    border: "border-l-blue-500",
    bg: "bg-blue-500/[0.04]",
    icon: Info,
    iconColor: "text-accent-blue",
    label: "Info",
    pillClass: "bg-blue-500/15 text-blue-200",
  },
};

function resourceHref(rec: Recommendation): string | null {
  if (!rec.resource) return null;
  switch (rec.resource.type) {
    case "rack":
      return `/racks/${rec.resource.id}`;
    case "device":
      return `/devices/${rec.resource.id}`;
    case "subnet":
      return `/ipam/${rec.resource.id}`;
    case "vlan":
      return `/network-tools/vlans/${rec.resource.id}`;
    default:
      return null;
  }
}

type Props = {
  recommendation: Recommendation;
  /** When true, render the dismiss + snooze controls. Off for read-only widgets. */
  interactive?: boolean;
  /** When true, render an "undo dismiss" control. */
  dismissed?: boolean;
};

export function RecommendationCard({
  recommendation,
  interactive = true,
  dismissed = false,
}: Props) {
  const meta = SEV_META[recommendation.severity];
  const Icon = meta.icon;
  const href = resourceHref(recommendation);
  const [pending, start] = useTransition();

  const handleDismiss = (snoozeDays: number | null) => {
    start(async () => {
      const result = await dismissRecommendation({
        ruleKey: recommendation.ruleKey,
        entityKey: recommendation.entityKey,
        snoozeDays,
      });
      if (!result.ok) toast.error(result.error);
      else toast.success(snoozeDays ? "Snoozed" : "Dismissed");
    });
  };

  const handleUndismiss = () => {
    start(async () => {
      const result = await undismissRecommendation(
        recommendation.ruleKey,
        recommendation.entityKey,
      );
      if (!result.ok) toast.error(result.error);
      else toast.success("Restored");
    });
  };

  const titleId =
    `rec-${recommendation.ruleKey}-${recommendation.entityKey}`.replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );

  return (
    <article
      aria-labelledby={titleId}
      className={twMerge(
        "flex gap-3 rounded-xl border border-white/[0.04] border-l-4 p-4",
        meta.border,
        meta.bg,
      )}
    >
      <Icon
        className={twMerge("mt-0.5 h-5 w-5 shrink-0", meta.iconColor)}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <h3 id={titleId} className="text-sm font-semibold text-white">
          {recommendation.title}
        </h3>
        <p className="mt-1 text-xs text-white/60">{recommendation.detail}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className={twMerge(
              "rounded px-1.5 py-0.5 font-medium uppercase tracking-wide",
              meta.pillClass,
            )}
          >
            {meta.label}
          </span>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-white/55">
            {recommendation.ruleKey}
          </span>
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-white/65 underline decoration-dotted underline-offset-2 hover:text-white hover:decoration-solid"
            >
              View {recommendation.resource?.type}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      {interactive && !dismissed && (
        <div className="flex shrink-0 items-start gap-1">
          <button
            type="button"
            onClick={() => handleDismiss(7)}
            disabled={pending}
            aria-label={`Snooze "${recommendation.title}" for 7 days`}
            title="Snooze 7 days"
            className="flex h-11 w-11 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60 disabled:opacity-50"
          >
            <Clock className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => handleDismiss(null)}
            disabled={pending}
            aria-label={`Dismiss "${recommendation.title}" permanently`}
            title="Dismiss permanently"
            className="flex h-11 w-11 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60 disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
      {interactive && dismissed && (
        <button
          type="button"
          onClick={handleUndismiss}
          disabled={pending}
          className="self-start rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/70 hover:bg-white/[0.08] disabled:opacity-50"
        >
          Restore
        </button>
      )}
    </article>
  );
}
