"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { Plus, Sparkle } from "@phosphor-icons/react/dist/ssr";

type Props = {
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  blurb: string;
  templateLabel?: string;
  onStartFromTemplate?: () => void;
  blankHref?: string;
  blankLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
};

export function EmptyStateWithTemplate({
  icon,
  iconClassName,
  title,
  blurb,
  templateLabel = "Start from template",
  onStartFromTemplate,
  blankHref,
  blankLabel = "Start blank",
  secondaryHref,
  secondaryLabel,
  className,
}: Props) {
  return (
    <div
      className={twMerge(
        "surface-card flex flex-col items-center px-6 py-16 text-center",
        className,
      )}
    >
      <div
        className={twMerge(
          "mb-4 rounded-xl p-4",
          iconClassName ?? "bg-accent-blue/20 text-accent-blue",
        )}
      >
        {icon}
      </div>
      <h2 className="mb-2 text-xl font-semibold text-white">{title}</h2>
      <p className="mb-6 max-w-md text-sm text-white/50">{blurb}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onStartFromTemplate && (
          <button
            type="button"
            onClick={onStartFromTemplate}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90"
          >
            <Sparkle className="h-4 w-4" weight="duotone" aria-hidden />
            {templateLabel}
          </button>
        )}
        {blankHref && (
          <Link
            href={blankHref}
            className="glass-button flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" weight="bold" aria-hidden />
            {blankLabel}
          </Link>
        )}
        {secondaryHref && secondaryLabel && (
          <Link
            href={secondaryHref}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
