"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  Warning,
  Info,
  ShieldWarning,
  X,
  Clock,
  ArrowSquareOut,
} from "@phosphor-icons/react/dist/ssr";
import { twMerge } from "tailwind-merge";
import toast from "react-hot-toast";
import {
  dismissRecommendation,
  undismissRecommendation,
} from "@/app/(dashboard)/network-tools/recommendations/actions";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import type { Recommendation, Severity } from "@/lib/recommendations/types";

type SevMeta = {
  border: string;
  bg: string;
  icon: typeof Warning;
  iconColor: string;
  label: string;
  led: string;
};

// Severity → Tag tone. Visible label text on the Tag keeps this from being
// color-only — matches WCAG 1.4.1.
const SEV_TONE: Record<Severity, "danger" | "warning" | "info"> = {
  critical: "danger",
  warning: "warning",
  info: "info",
};

const SEV_META: Record<Severity, SevMeta> = {
  critical: {
    border: "border-l-accent-red",
    bg: "bg-accent-red/[0.04]",
    icon: ShieldWarning,
    iconColor: "text-accent-red",
    label: "Critical",
    led: "led-dot--red",
  },
  warning: {
    border: "border-l-accent-orange",
    bg: "bg-accent-orange/[0.04]",
    icon: Warning,
    iconColor: "text-accent-orange",
    label: "Warning",
    led: "led-dot--amber",
  },
  info: {
    border: "border-l-accent-blue",
    bg: "bg-accent-blue/[0.04]",
    icon: Info,
    iconColor: "text-accent-blue",
    label: "Info",
    led: "led-dot--muted",
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
        "surface-card flex gap-3 border-l-4 p-4",
        meta.border,
        meta.bg,
      )}
    >
      <Icon
        className={twMerge("mt-0.5 h-5 w-5 shrink-0", meta.iconColor)}
        weight="duotone"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <h3 id={titleId} className="text-sm font-semibold text-white">
          {recommendation.title}
        </h3>
        <p className="mt-1 text-xs text-white/60">{recommendation.detail}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <span className={twMerge("led-dot", meta.led)} aria-hidden />
            <Tag tone={SEV_TONE[recommendation.severity]} size="sm">
              {meta.label}
            </Tag>
          </span>
          <span className="mono rounded bg-white/[0.06] px-1.5 py-0.5 text-white/55">
            {recommendation.ruleKey}
          </span>
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-white/65 underline decoration-dotted underline-offset-2 hover:text-white hover:decoration-solid"
            >
              View {recommendation.resource?.type}
              <ArrowSquareOut className="h-3 w-3" weight="bold" aria-hidden />
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
            className="flex h-11 w-11 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 disabled:opacity-50"
          >
            <Clock className="h-4 w-4" weight="bold" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => handleDismiss(null)}
            disabled={pending}
            aria-label={`Dismiss "${recommendation.title}" permanently`}
            title="Dismiss permanently"
            className="flex h-11 w-11 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 disabled:opacity-50"
          >
            <X className="h-4 w-4" weight="bold" aria-hidden />
          </button>
        </div>
      )}
      {interactive && dismissed && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleUndismiss}
          disabled={pending}
          className="self-start"
        >
          Restore
        </Button>
      )}
    </article>
  );
}
