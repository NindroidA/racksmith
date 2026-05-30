import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

/**
 * RackSmith's single source of truth for button-shaped things.
 *
 * Three variants — that's the rule. If you find yourself reaching for
 * a fourth (a glass surface, an outlined-with-cyan, a dashed border…)
 * the answer is "no, pick one of these and live with it." The whole
 * point of the primitive is that we stop accumulating button styles
 * the same way we accumulated badge styles.
 *
 *   primary   → the single "do this" action per surface (filled blue)
 *   secondary → confirmable but-not-primary actions (subtle glass)
 *   ghost     → tertiary affordances (text + icon only, no surface)
 *   danger    → destructive (red); use sparingly, always pair with confirm
 *
 * The four sizes (`sm`/`md`/`lg`) are calibrated against the design
 * grid: sm fits inside table rows, md is the default for forms, lg is
 * for the landing hero + onboarding step CTAs.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional icon placed before the label. */
  iconLeft?: ReactNode;
  /** Optional icon placed after the label. */
  iconRight?: ReactNode;
  /** Render as a fixed-width loading state (replaces the children with a spinner). */
  loading?: boolean;
};

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium " +
  "transition-[background-color,border-color,color,opacity,transform] duration-150 " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm shadow-primary/20 " +
    "hover:bg-primary/90 active:translate-y-px " +
    "disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none",
  secondary:
    "bg-white/[0.06] text-white border border-white/10 " +
    "hover:bg-white/[0.10] hover:border-white/20 hover:text-white " +
    "active:translate-y-px " +
    "disabled:bg-white/[0.03] disabled:text-white/35 disabled:border-white/[0.06]",
  ghost:
    "bg-transparent text-white/70 " +
    "hover:bg-white/[0.06] hover:text-white " +
    "disabled:text-white/30",
  danger:
    "bg-accent-red/85 text-white shadow-sm shadow-accent-red/25 " +
    "hover:bg-accent-red active:translate-y-px " +
    "disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    iconLeft,
    iconRight,
    loading,
    disabled,
    className,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={twMerge(BASE, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {iconLeft && <span className="-ml-0.5 flex">{iconLeft}</span>}
          <span className="whitespace-nowrap">{children}</span>
          {iconRight && <span className="-mr-0.5 flex">{iconRight}</span>}
        </>
      )}
    </button>
  );
});

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
