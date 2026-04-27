"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { twMerge } from "tailwind-merge";

type OptionData = {
  id: string;
  value: string;
  label: string;
  disabled: boolean;
};

type SelectContextValue = {
  registerOption: (data: OptionData) => void;
  unregisterOption: (id: string) => void;
};

const SelectContext = createContext<SelectContextValue | null>(null);

type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  /**
   * Hidden input `name` for participating in native `<form>` submission —
   * primarily for GET-style filter forms (see settings/audit). When set,
   * the current value submits alongside the form.
   */
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/**
 * Styled dropdown primitive matching the glass-input trigger + raised-surface
 * panel idiom. Hand-rolled to stay consistent with the other UI primitives in
 * this directory (tooltip, delete-confirm-dialog). Uses the
 * `aria-activedescendant` listbox pattern — focus stays on the trigger, visual
 * "active" state rides along via an id reference.
 *
 * Options register their metadata via <SelectOption> children (which render
 * nothing); the popover panel renders the visible rows from that registered
 * list. This avoids double-mounting that would happen if the same children
 * were rendered both in-tree and inside the portal.
 */
export function Select({
  value,
  onValueChange,
  id,
  name,
  placeholder,
  disabled,
  className,
  children,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: SelectProps) {
  const reactId = useId();
  const triggerId = id ?? reactId;
  const listboxId = `${triggerId}-listbox`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const [options, setOptions] = useState<Map<string, OptionData>>(new Map());
  const reduceMotion = useReducedMotion();

  // Typeahead — accumulate letters for 500ms, jump to next matching option.
  const typeaheadRef = useRef<{ query: string; clearAt: number }>({
    query: "",
    clearAt: 0,
  });

  const registerOption = useCallback((data: OptionData) => {
    setOptions((prev) => {
      const existing = prev.get(data.id);
      if (
        existing &&
        existing.value === data.value &&
        existing.label === data.label &&
        existing.disabled === data.disabled
      ) {
        return prev;
      }
      const next = new Map(prev);
      next.set(data.id, data);
      return next;
    });
  }, []);

  const unregisterOption = useCallback((id: string) => {
    setOptions((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const orderedOptions = useMemo(() => Array.from(options.values()), [options]);

  const selectedOption = useMemo(
    () => orderedOptions.find((o) => o.value === value) ?? null,
    [orderedOptions, value],
  );

  const selectOption = useCallback(
    (v: string) => {
      onValueChange(v);
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    },
    [onValueChange],
  );

  // Compute panel coords when opening.
  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    // Rough panel height heuristic for below/above decision — cap at 320px
    // (max-h-80 equivalent); if less than that below, flip above.
    const panelHeight = Math.min(orderedOptions.length * 40 + 8, 320);
    const spaceBelow = window.innerHeight - rect.bottom;
    const flip = spaceBelow < panelHeight + 8 && rect.top > panelHeight + 8;
    setPlacement(flip ? "above" : "below");
    setCoords({
      top: flip ? rect.top : rect.bottom,
      left: rect.left,
      width: rect.width,
    });
  }, [open, orderedOptions.length]);

  // Seed activeId when the panel opens — start at the selected option (if
  // enabled), otherwise the first enabled option. Only runs when `open`
  // transitions or option membership changes.
  const optionsSignature = useMemo(
    () => orderedOptions.map((o) => `${o.id}:${o.disabled}`).join("|"),
    [orderedOptions],
  );
  useEffect(() => {
    if (!open) return;
    if (selectedOption && !selectedOption.disabled) {
      setActiveId(selectedOption.id);
      return;
    }
    const firstEnabled = orderedOptions.find((o) => !o.disabled);
    setActiveId(firstEnabled?.id ?? null);
    // orderedOptions captured via optionsSignature to avoid re-seeding on
    // every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, optionsSignature, selectedOption?.id]);

  // Scroll the active option into view inside the panel.
  useEffect(() => {
    if (!open || !activeId) return;
    const panel = panelRef.current;
    if (!panel) return;
    const item = panel.querySelector<HTMLElement>(
      `[data-option-id="${activeId}"]`,
    );
    item?.scrollIntoView({ block: "nearest" });
  }, [open, activeId]);

  // Close on outside click, outside scroll, or window resize.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (
      !open &&
      (e.key === "Enter" ||
        e.key === " " ||
        e.key === "ArrowDown" ||
        e.key === "ArrowUp")
    ) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        return;
      case "Tab":
        setOpen(false);
        return;
      case "Enter":
      case " ": {
        e.preventDefault();
        if (!activeId) return;
        const active = options.get(activeId);
        if (active && !active.disabled) selectOption(active.value);
        return;
      }
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const nextId = findNextEnabledId(orderedOptions, activeId, dir);
        if (nextId) setActiveId(nextId);
        return;
      }
      case "Home": {
        e.preventDefault();
        const first = orderedOptions.find((o) => !o.disabled);
        if (first) setActiveId(first.id);
        return;
      }
      case "End": {
        e.preventDefault();
        const last = [...orderedOptions].reverse().find((o) => !o.disabled);
        if (last) setActiveId(last.id);
        return;
      }
      default: {
        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
        const now = Date.now();
        const state = typeaheadRef.current;
        state.query =
          now > state.clearAt
            ? e.key.toLowerCase()
            : state.query + e.key.toLowerCase();
        state.clearAt = now + 500;
        const match = findByTypeahead(orderedOptions, state.query, activeId);
        if (match) setActiveId(match.id);
      }
    }
  };

  const ctxValue = useMemo<SelectContextValue>(
    () => ({ registerOption, unregisterOption }),
    [registerOption, unregisterOption],
  );

  const displayLabel = selectedOption?.label ?? "";
  const showPlaceholder = !selectedOption;

  return (
    <SelectContext.Provider value={ctxValue}>
      {name && !disabled && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? (activeId ?? undefined) : undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        className={twMerge(
          "glass-input flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span
          className={twMerge("truncate", showPlaceholder && "text-white/40")}
        >
          {showPlaceholder ? (placeholder ?? "Select…") : displayLabel}
        </span>
        <ChevronDown
          className={twMerge(
            "ml-2 h-4 w-4 shrink-0 text-white/50 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {/* SelectOption components mount here to register their metadata; they
          render null, so this adds no DOM nodes. */}
      {children}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && coords && (
              <motion.ul
                ref={panelRef}
                id={listboxId}
                role="listbox"
                aria-labelledby={triggerId}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: placement === "below" ? -4 : 4 }
                }
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: placement === "below" ? -4 : 4 }
                }
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{
                  position: "fixed",
                  top: placement === "below" ? coords.top + 6 : coords.top - 6,
                  left: coords.left,
                  width: coords.width,
                  transform:
                    placement === "above" ? "translateY(-100%)" : undefined,
                  zIndex: 70,
                }}
                className="max-h-80 overflow-auto rounded-lg border border-white/10 bg-surface-raised py-1 shadow-2xl shadow-black/60"
              >
                {orderedOptions.length === 0 && (
                  <li
                    role="presentation"
                    className="px-3 py-2 text-sm text-white/40"
                  >
                    No options
                  </li>
                )}
                {orderedOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  const isActive = opt.id === activeId;
                  return (
                    <li
                      key={opt.id}
                      id={opt.id}
                      data-option-id={opt.id}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={opt.disabled || undefined}
                      onMouseEnter={() => {
                        if (!opt.disabled) setActiveId(opt.id);
                      }}
                      onClick={() => {
                        if (!opt.disabled) selectOption(opt.value);
                      }}
                      className={twMerge(
                        "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-white/85",
                        isActive && !opt.disabled && "bg-primary/15 text-white",
                        opt.disabled && "cursor-not-allowed opacity-40",
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <Check
                          className="h-4 w-4 shrink-0 text-primary"
                          aria-hidden
                        />
                      )}
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </SelectContext.Provider>
  );
}

type SelectOptionProps = {
  value: string;
  disabled?: boolean;
  children: ReactNode;
};

export function SelectOption({ value, disabled, children }: SelectOptionProps) {
  const ctx = useContext(SelectContext);
  if (!ctx) {
    throw new Error("<SelectOption> must be used inside <Select>");
  }
  const { registerOption, unregisterOption } = ctx;
  const reactId = useId();
  const id = `select-option-${reactId}`;

  const label =
    typeof children === "string" || typeof children === "number"
      ? String(children)
      : extractText(children);

  // useLayoutEffect so options are registered before first paint — avoids a
  // visible flash where the trigger shows the placeholder instead of the
  // selected option's label on initial mount.
  useLayoutEffect(() => {
    registerOption({ id, value, label, disabled: !!disabled });
    return () => unregisterOption(id);
  }, [id, value, label, disabled, registerOption, unregisterOption]);

  return null;
}

// ── Helpers (pure, exported for tests) ───────────────────────────────────────

export function findNextEnabledId(
  options: Array<{ id: string; disabled: boolean }>,
  currentId: string | null,
  direction: 1 | -1,
): string | null {
  if (options.length === 0) return null;
  const len = options.length;
  const idx = currentId
    ? options.findIndex((o) => o.id === currentId)
    : direction === 1
      ? -1
      : len;
  for (let i = 1; i <= len; i++) {
    const raw = idx + direction * i;
    const next = ((raw % len) + len) % len;
    const candidate = options[next];
    if (candidate && !candidate.disabled) return candidate.id;
  }
  return null;
}

export function findByTypeahead(
  options: Array<{ id: string; label: string; disabled: boolean }>,
  query: string,
  currentId: string | null,
): { id: string; label: string; disabled: boolean } | null {
  if (!query) return null;
  const q = query.toLowerCase();
  const enabled = options.filter((o) => !o.disabled);
  if (enabled.length === 0) return null;
  const startIdx = currentId
    ? Math.max(0, enabled.findIndex((o) => o.id === currentId) + 1)
    : 0;
  for (let i = 0; i < enabled.length; i++) {
    const probe = enabled[(startIdx + i) % enabled.length];
    if (probe && probe.label.toLowerCase().startsWith(q)) return probe;
  }
  return null;
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    if (props?.children != null) return extractText(props.children);
  }
  return "";
}
