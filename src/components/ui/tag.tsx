import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

/**
 * RackSmith Tag — the only badge-shaped thing.
 *
 * Tones map to existing accent tokens; every chip in the app should be
 * one of these. The "filled" variant is the default — used for
 * status/role/identity. The "subtle" variant is for static labels next
 * to dense lists where a filled chip would be visually loud.
 *
 * Sizes:
 *   sm   → 18px tall (inline with body text)
 *   md   → 22px tall (sits in card headers, plan rows)
 */

type TagTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent";
type TagVariant = "filled" | "subtle";
type TagSize = "sm" | "md";

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: TagTone;
  variant?: TagVariant;
  size?: TagSize;
  iconLeft?: ReactNode;
};

const TONE_FILLED: Record<TagTone, string> = {
  neutral: "bg-white/12 text-white",
  info: "bg-primary/85 text-white",
  success: "bg-accent-green/85 text-white",
  warning: "bg-accent-orange/85 text-white",
  danger: "bg-accent-red/85 text-white",
  accent: "bg-accent-purple/85 text-white",
};

const TONE_SUBTLE: Record<TagTone, string> = {
  neutral: "bg-white/6 text-white/75 border border-white/8",
  info: "bg-primary/12 text-primary border border-primary/20",
  success: "bg-accent-green/12 text-accent-green border border-accent-green/25",
  warning:
    "bg-accent-orange/12 text-accent-orange border border-accent-orange/25",
  danger: "bg-accent-red/12 text-accent-red border border-accent-red/25",
  accent:
    "bg-accent-purple/12 text-accent-purple border border-accent-purple/25",
};

const SIZES: Record<TagSize, string> = {
  sm: "h-[18px] px-1.5 text-[10px] gap-1",
  md: "h-[22px] px-2 text-[11px] gap-1.5",
};

export const Tag = forwardRef<HTMLSpanElement, Props>(function Tag(
  {
    tone = "neutral",
    variant = "filled",
    size = "sm",
    iconLeft,
    className,
    children,
    ...rest
  },
  ref,
) {
  const palette = variant === "filled" ? TONE_FILLED[tone] : TONE_SUBTLE[tone];
  return (
    <span
      ref={ref}
      className={twMerge(
        "inline-flex items-center rounded-full font-semibold uppercase tracking-wide",
        SIZES[size],
        palette,
        className,
      )}
      {...rest}
    >
      {iconLeft && (
        <span className="flex shrink-0" aria-hidden="true">
          {iconLeft}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
});
