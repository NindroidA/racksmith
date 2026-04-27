"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  HardDrive,
  Layers,
  Server,
  Shield,
  Wifi,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { InlineHelp } from "@/components/ui/inline-help";
import type {
  ProfileInput,
  RecommendedDevice,
  TopologyInput,
} from "@/lib/plan/wizard-types";

const ICON_BY_TYPE: Record<RecommendedDevice["deviceType"], typeof Server> = {
  switch: Layers,
  router: Server,
  firewall: Shield,
  server: HardDrive,
  other: Wifi,
};

// Stable identity signature — used both as React `key` and to match
// previously-selected entries when resuming the wizard.
function deviceSig(d: RecommendedDevice): string {
  return `${d.manufacturer}::${d.model}::${d.deviceType}::${d.sizeU}::${d.portCount}`;
}

type Props = {
  profile: ProfileInput | undefined;
  recommended: ReadonlyArray<RecommendedDevice>;
  value: TopologyInput | undefined;
  defaultRackSize: number;
  disabled: boolean;
  onBack: () => void;
  onNext: (topology: TopologyInput) => void;
};

export function WizardStepTopology({
  profile,
  recommended,
  value,
  defaultRackSize,
  disabled,
  onBack,
  onNext,
}: Props) {
  // Selection is keyed by the recommendation's index in `recommended`.
  // The recommender is deterministic per-profile, so index identity is
  // stable across renders. Two recommendations with identical descriptive
  // tuples (same manufacturer + model + role) won't share a key.
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(
    () => new Set(initialIndices(recommended, value)),
  );
  const [rackName, setRackName] = useState(value?.rackName ?? "Plan rack");
  const [rackSizeU, setRackSizeU] = useState(
    value?.rackSizeU ?? defaultRackSize,
  );

  useEffect(() => {
    // Re-key when the profile-driven recommendation list changes.
    if (!value) {
      setSelectedIdx(new Set(recommended.map((_, i) => i)));
    }
  }, [recommended, value]);

  if (!profile) {
    return (
      <div className="glass-card rounded-xl p-6 text-sm text-white/60">
        Complete the profile step first.
      </div>
    );
  }

  const toggle = (idx: number) => {
    setSelectedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const submit = () => {
    const selected = recommended.filter((_, i) => selectedIdx.has(i));
    if (selected.length === 0) return;
    onNext({ selected, rackName, rackSizeU });
  };

  return (
    <fieldset disabled={disabled} className="space-y-8">
      <section className="glass-card rounded-xl p-6">
        <header className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Recommended equipment
            </h3>
            <p className="mt-1 text-sm text-white/50">
              Toggle devices off to skip them. Reasoning shown for each.
            </p>
          </div>
          <span className="text-sm text-white/50">
            {selectedIdx.size} selected
          </span>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recommended.map((dev, idx) => {
            const Icon = ICON_BY_TYPE[dev.deviceType];
            const selected = selectedIdx.has(idx);
            return (
              <button
                key={`${deviceSig(dev)}-${idx}`}
                type="button"
                onClick={() => toggle(idx)}
                aria-pressed={selected}
                className={twMerge(
                  "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                  selected
                    ? "border-primary/60 bg-primary/[0.06]"
                    : "border-white/[0.08] bg-white/[0.02] opacity-60 hover:opacity-90",
                )}
              >
                <Icon
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {dev.manufacturer} {dev.model}
                    </span>
                    <span className="text-xs text-white/40">
                      {dev.sizeU > 0 ? `${dev.sizeU}U` : "0U"} · {dev.portCount}{" "}
                      ports
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/60">{dev.reason}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white">Target rack</h3>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <InlineHelp htmlFor="rack-name">Rack name</InlineHelp>
            <input
              id="rack-name"
              type="text"
              value={rackName}
              onChange={(e) => setRackName(e.target.value)}
              maxLength={100}
              className="glass-input w-full rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <InlineHelp htmlFor="rack-size" term="RACK_UNIT">
              Rack size (U)
            </InlineHelp>
            <input
              id="rack-size"
              type="number"
              min={1}
              max={60}
              value={rackSizeU}
              onChange={(e) =>
                setRackSizeU(Math.max(1, Number(e.target.value) || 1))
              }
              className="glass-input w-full rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={
            disabled || selectedIdx.size === 0 || rackName.trim() === ""
          }
          className="btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          Plan VLAN + IP <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </fieldset>
  );
}

// On first mount, default to selecting every recommendation. If the wizard
// is being resumed (`value` set), restore the previously-selected indices by
// matching saved entries back against the current recommendation list — a
// recommender change between save + resume could orphan an entry, in which
// case the orphan is silently dropped.
function initialIndices(
  recommended: ReadonlyArray<RecommendedDevice>,
  value: TopologyInput | undefined,
): number[] {
  if (!value) return recommended.map((_, i) => i);
  const savedSigs = new Set(value.selected.map(deviceSig));
  const out: number[] = [];
  recommended.forEach((d, i) => {
    if (savedSigs.has(deviceSig(d))) out.push(i);
  });
  return out;
}
