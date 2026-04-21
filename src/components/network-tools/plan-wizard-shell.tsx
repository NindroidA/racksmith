"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { twMerge } from "tailwind-merge";
import { Check, ChevronRight } from "lucide-react";
import {
  applyBuildPlan,
  saveNetworkStep,
  saveProfileStep,
  saveTopologyStep,
} from "@/app/(dashboard)/network-tools/plan-wizard/actions";
import type { ActionResult } from "@/lib/action-types";
import {
  recommendRackSizeU,
  recommendTopology,
} from "@/lib/plan/recommend-topology";
import type {
  NetworkInput,
  ProfileInput,
  RecommendedDevice,
  TopologyInput,
  WizardInputs,
  WizardStep,
} from "@/lib/plan/wizard-types";
import { WizardStepProfile } from "./wizard-step-profile";
import { WizardStepTopology } from "./wizard-step-topology";
import { WizardStepNetwork } from "./wizard-step-network";
import { WizardStepReview } from "./wizard-step-review";

const STEPS: ReadonlyArray<{ key: WizardStep; label: string }> = [
  { key: "profile", label: "Profile" },
  { key: "topology", label: "Topology" },
  { key: "network", label: "VLAN + IP" },
  { key: "review", label: "Review" },
];

type Props = {
  planId: string;
  planName: string;
  initialInputs: WizardInputs;
  status: string;
};

export function PlanWizardShell({
  planId,
  planName,
  initialInputs,
  status,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(() =>
    firstUnsetStep(initialInputs),
  );
  const [inputs, setInputs] = useState<WizardInputs>(initialInputs);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const readOnly = status !== "draft";
  const reducedMotion = useReducedMotion();
  const stepDuration = reducedMotion ? 0 : 0.18;
  const stepShift = reducedMotion ? 0 : 8;

  const recommendedTopology = useMemo<RecommendedDevice[]>(() => {
    if (!inputs.profile) return [];
    return recommendTopology(inputs.profile);
  }, [inputs.profile]);

  const persistAndAdvance = async (
    next: WizardStep | null,
    saveFn: () => Promise<ActionResult>,
  ) => {
    setBusy(true);
    try {
      const result = await saveFn();
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      if (next) setStep(next);
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleProfileNext = async (profile: ProfileInput) => {
    const ok = await persistAndAdvance("topology", () =>
      saveProfileStep(planId, profile),
    );
    if (ok) setInputs((prev) => ({ ...prev, profile }));
  };

  const handleTopologyNext = async (topology: TopologyInput) => {
    const ok = await persistAndAdvance("network", () =>
      saveTopologyStep(planId, topology),
    );
    if (ok) setInputs((prev) => ({ ...prev, topology }));
  };

  const handleNetworkNext = async (network: NetworkInput) => {
    const ok = await persistAndAdvance("review", () =>
      saveNetworkStep(planId, network),
    );
    if (ok) setInputs((prev) => ({ ...prev, network }));
  };

  const handleApply = () => {
    start(async () => {
      const result = await applyBuildPlan(planId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Created 1 rack, ${result.data.deviceCount} devices, ${result.data.vlanCount} VLANs`,
      );
      router.push(`/racks/${result.data.rackId}`);
    });
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">{planName}</h1>
        <p className="mt-1 text-sm text-white/50">
          Build a complete network plan, then materialize racks, devices, VLANs,
          and subnets in one click.
          {readOnly && (
            <span className="ml-2 rounded bg-white/[0.06] px-2 py-0.5 text-xs text-white/60">
              {status}
            </span>
          )}
        </p>
      </header>

      <Stepper
        current={step}
        onSelect={readOnly ? () => {} : setStep}
        inputs={inputs}
      />

      <div className="mt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: stepShift }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -stepShift }}
            transition={{ duration: stepDuration, ease: "easeOut" }}
          >
            {step === "profile" && (
              <WizardStepProfile
                value={inputs.profile}
                disabled={readOnly || busy}
                onNext={handleProfileNext}
              />
            )}
            {step === "topology" && (
              <WizardStepTopology
                disabled={readOnly || busy}
                profile={inputs.profile}
                recommended={recommendedTopology}
                value={inputs.topology}
                defaultRackSize={recommendRackSizeU(recommendedTopology)}
                onBack={() => setStep("profile")}
                onNext={handleTopologyNext}
              />
            )}
            {step === "network" && (
              <WizardStepNetwork
                disabled={readOnly || busy}
                value={inputs.network}
                onBack={() => setStep("topology")}
                onNext={handleNetworkNext}
              />
            )}
            {step === "review" && (
              <WizardStepReview
                inputs={inputs}
                disabled={readOnly}
                pending={pending}
                onBack={() => setStep("network")}
                onApply={handleApply}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Stepper({
  current,
  onSelect,
  inputs,
}: {
  current: WizardStep;
  onSelect: (step: WizardStep) => void;
  inputs: WizardInputs;
}) {
  const completed = (key: WizardStep) => {
    if (key === "profile") return !!inputs.profile;
    if (key === "topology") return !!inputs.topology;
    if (key === "network") return !!inputs.network;
    return false;
  };

  return (
    <nav aria-label="Plan wizard steps">
      <ol className="flex items-center gap-3">
        {STEPS.map((s, idx) => {
          const isCurrent = current === s.key;
          const isDone = completed(s.key);
          const reachable =
            idx === 0 || completed(STEPS[idx - 1].key) || isDone || isCurrent;

          return (
            <li key={s.key} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => reachable && onSelect(s.key)}
                disabled={!reachable}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${idx + 1} of ${STEPS.length}: ${s.label}${isDone ? " (completed)" : isCurrent ? " (current)" : ""}`}
                className={twMerge(
                  "flex items-center gap-2 rounded-full border px-3 py-2.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e1a]",
                  isCurrent
                    ? "border-primary/60 bg-primary/15 text-white"
                    : isDone
                      ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                      : "border-white/10 bg-white/[0.03] text-white/50",
                  !reachable && "opacity-40 cursor-not-allowed",
                )}
              >
                <span
                  aria-hidden
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px]"
                >
                  {isDone ? <Check className="h-3 w-3" /> : idx + 1}
                </span>
                {s.label}
              </button>
              {idx < STEPS.length - 1 && (
                <ChevronRight className="h-3 w-3 text-white/20" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function firstUnsetStep(inputs: WizardInputs): WizardStep {
  if (!inputs.profile) return "profile";
  if (!inputs.topology) return "topology";
  if (!inputs.network) return "network";
  return "review";
}
