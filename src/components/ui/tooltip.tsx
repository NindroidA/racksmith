"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { getGlossaryEntry } from "@/lib/networking-glossary";

type TermProps = {
  term: string;
  children?: ReactNode;
  className?: string;
};

type ContentProps = {
  content: ReactNode;
  children: ReactNode;
  className?: string;
};

type Props = TermProps | ContentProps;

function isTermForm(p: Props): p is TermProps {
  return "term" in p;
}

const OFFSET = 8;
const VIEWPORT_PAD = 8;

type Placement = "top" | "bottom";

export function Tooltip(props: Props) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    placement: Placement;
  } | null>(null);

  const entry = isTermForm(props) ? getGlossaryEntry(props.term) : null;

  const bubbleContent: ReactNode = isTermForm(props)
    ? entry
      ? (
          <>
            <div className="text-sm font-semibold text-white">{entry.term}</div>
            <div className="mt-1 text-xs text-white/80">{entry.short}</div>
            {entry.long && (
              <div className="mt-2 text-xs text-white/60">{entry.long}</div>
            )}
            {entry.link && (
              <a
                href={entry.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-accent-blue hover:underline"
              >
                Learn more ↗
              </a>
            )}
          </>
        )
      : (
          <div className="text-xs text-white/80">{props.term}</div>
        )
    : props.content;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const bubble = bubbleRef.current;
    if (!trigger || !bubble) return;

    const t = trigger.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const preferredTop = t.top - b.height - OFFSET;
    const placement: Placement = preferredTop < VIEWPORT_PAD ? "bottom" : "top";

    const top =
      placement === "top" ? t.top - b.height - OFFSET : t.bottom + OFFSET;

    let left = t.left + t.width / 2 - b.width / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, vw - b.width - VIEWPORT_PAD));

    setPosition({
      top: Math.max(VIEWPORT_PAD, Math.min(top, vh - b.height - VIEWPORT_PAD)),
      left,
      placement,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  const portalStyle: CSSProperties = position
    ? { top: `${position.top}px`, left: `${position.left}px` }
    : { opacity: 0, pointerEvents: "none" };

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={isTermForm(props) ? 0 : undefined}
        aria-describedby={open ? id : undefined}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={twMerge(
          isTermForm(props)
            ? "inline-flex cursor-help items-center gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            : "inline-flex",
          props.className,
        )}
      >
        {isTermForm(props) ? (
          <>
            <span className="underline decoration-dotted decoration-white/30 underline-offset-2">
              {props.children ?? props.term}
            </span>
            <HelpCircle
              className="h-3.5 w-3.5 shrink-0 text-white/40"
              aria-hidden
            />
          </>
        ) : (
          props.children
        )}
      </span>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={bubbleRef}
            id={id}
            role="tooltip"
            onPointerEnter={show}
            onPointerLeave={hide}
            style={portalStyle}
            className={twMerge(
              "pointer-events-auto fixed z-50 max-w-xs rounded-lg px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)]",
              "border border-white/15 bg-[rgba(20,25,40,0.95)] backdrop-blur-xl",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150",
            )}
          >
            {bubbleContent}
          </div>,
          document.body,
        )}
    </>
  );
}
