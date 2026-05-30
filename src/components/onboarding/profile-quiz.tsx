"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CaretRight,
  House,
  Stack,
  Users,
  Compass,
} from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";
import { saveProfile } from "@/app/(dashboard)/settings/actions";
import {
  PROFILE_ROLES,
  PROFILE_SCALES,
  PROFILE_USES,
  type SaveProfileInput,
} from "@/lib/profile-constants";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type Role = (typeof PROFILE_ROLES)[number];
type Scale = (typeof PROFILE_SCALES)[number];
type Use = (typeof PROFILE_USES)[number];

const ROLE_OPTIONS: Array<{
  value: Role;
  label: string;
  blurb: string;
  icon: ReactNode;
}> = [
  {
    value: "homelab",
    label: "Homelab",
    blurb: "Personal setup, 1–2 racks.",
    icon: <House className="h-5 w-5" aria-hidden weight="duotone" />,
  },
  {
    value: "small_it",
    label: "Small IT team",
    blurb: "In-house IT at a business.",
    icon: <Users className="h-5 w-5" aria-hidden weight="duotone" />,
  },
  {
    value: "msp",
    label: "MSP / Consultant",
    blurb: "Managing client infrastructure.",
    icon: <Stack className="h-5 w-5" aria-hidden weight="duotone" />,
  },
  {
    value: "exploring",
    label: "Just exploring",
    blurb: "Kicking the tires.",
    icon: <Compass className="h-5 w-5" aria-hidden weight="duotone" />,
  },
];

const SCALE_OPTIONS: Array<{ value: Scale; label: string; blurb: string }> = [
  { value: "1_rack", label: "1 rack", blurb: "Getting started." },
  { value: "2_5_racks", label: "2–5 racks", blurb: "Small deployment." },
  { value: "6_plus", label: "6+ racks", blurb: "Serious infrastructure." },
];

const USE_OPTIONS: Array<{ value: Use; label: string; blurb: string }> = [
  {
    value: "document",
    label: "Document what we have",
    blurb: "Inventory existing infrastructure.",
  },
  {
    value: "plan",
    label: "Plan new infrastructure",
    blurb: "Design before deploying.",
  },
  {
    value: "audit",
    label: "Audit or hand off",
    blurb: "Prep for a review or migration.",
  },
  { value: "train", label: "Train / learn", blurb: "Study topologies." },
  { value: "other", label: "Something else", blurb: "" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ProfileQuiz({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(open, dialogRef);

  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [scale, setScale] = useState<Scale | null>(null);
  const [use, setUse] = useState<Use | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (skipped: boolean) => {
    const input: SaveProfileInput = {
      profileRole: role,
      profileScale: scale,
      profileUse: use,
      skipped,
    };
    startTransition(async () => {
      const result = await saveProfile(input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (!skipped) {
        toast.success("Welcome aboard. We'll tailor things to fit.");
      }
      onClose();
    });
  };

  const canProceed =
    (step === 0 && role) || (step === 1 && scale) || step === 2;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="glass-panel relative w-full max-w-lg overflow-hidden rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-title"
          >
            <header className="border-b border-white/[0.08] px-6 pb-5 pt-6">
              <div
                role="progressbar"
                aria-valuenow={step + 1}
                aria-valuemin={1}
                aria-valuemax={3}
                aria-label={`Step ${step + 1} of 3`}
                className="mb-3 flex items-center gap-2"
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    aria-hidden
                    className={twMerge(
                      "h-1 w-10 rounded-full transition-colors",
                      i <= step ? "bg-primary" : "bg-white/10",
                    )}
                  />
                ))}
              </div>
              <h2 id="quiz-title" className="text-xl font-semibold text-white">
                {step === 0 && "Welcome to RackSmith."}
                {step === 1 && "How large is your environment?"}
                {step === 2 && "What brings you here?"}
              </h2>
              <p className="mt-1 text-sm text-white/50">
                {step === 0 &&
                  "Tell us about your role so we can tailor defaults."}
                {step === 1 && "We'll recommend templates that fit."}
                {step === 2 && "Optional — helps us prioritize what to polish."}
              </p>
            </header>

            <div className="px-6 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2"
                >
                  {step === 0 &&
                    ROLE_OPTIONS.map((opt) => (
                      <OptionRow
                        key={opt.value}
                        icon={opt.icon}
                        label={opt.label}
                        blurb={opt.blurb}
                        selected={role === opt.value}
                        onClick={() => setRole(opt.value)}
                      />
                    ))}
                  {step === 1 &&
                    SCALE_OPTIONS.map((opt) => (
                      <OptionRow
                        key={opt.value}
                        label={opt.label}
                        blurb={opt.blurb}
                        selected={scale === opt.value}
                        onClick={() => setScale(opt.value)}
                      />
                    ))}
                  {step === 2 &&
                    USE_OPTIONS.map((opt) => (
                      <OptionRow
                        key={opt.value}
                        label={opt.label}
                        blurb={opt.blurb}
                        selected={use === opt.value}
                        onClick={() => setUse(opt.value)}
                      />
                    ))}
                </motion.div>
              </AnimatePresence>
            </div>

            <footer className="flex items-center justify-between border-t border-white/[0.08] px-6 py-4">
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={pending}
                className="text-sm font-medium text-white/50 transition-colors hover:text-white disabled:opacity-50"
              >
                Skip — I&apos;ll explore
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s - 1)}
                    disabled={pending}
                    className="glass-button rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Back
                  </button>
                )}
                {step < 2 ? (
                  <button
                    type="button"
                    disabled={!canProceed || pending}
                    onClick={() => setStep((s) => s + 1)}
                    className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <CaretRight className="h-4 w-4" aria-hidden weight="bold" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => submit(false)}
                    className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50"
                  >
                    {pending ? "Saving…" : "Finish"}
                  </button>
                )}
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function OptionRow({
  icon,
  label,
  blurb,
  selected,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  blurb: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={twMerge(
        "group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
        selected
          ? "border-primary/40 bg-primary/10"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]",
      )}
    >
      {icon && (
        <span
          className={twMerge(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            selected
              ? "bg-primary/20 text-primary"
              : "bg-white/[0.04] text-white/60",
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex-1">
        <span className="block text-sm font-medium text-white">{label}</span>
        {blurb && (
          <span className="mt-0.5 block text-xs text-white/50">{blurb}</span>
        )}
      </span>
      {selected && (
        <Check
          className="h-4 w-4 shrink-0 text-primary"
          aria-hidden
          weight="bold"
        />
      )}
    </button>
  );
}
