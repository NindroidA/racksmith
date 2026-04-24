"use client";

import { useState } from "react";
import { Zap, Users, Building2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { InlineHelp } from "@/components/ui/inline-help";
import { Select, SelectOption } from "@/components/ui/select";
import {
  SITE_TYPE_LABELS,
  UPLINK_LABELS,
  type ProfileInput,
  type SiteType,
  type UplinkSpeed,
} from "@/lib/plan/wizard-types";

const SITE_OPTIONS: ReadonlyArray<{
  key: SiteType;
  label: string;
  blurb: string;
  icon: typeof Zap;
}> = [
  {
    key: "home",
    label: SITE_TYPE_LABELS.home,
    blurb: "Personal homelab or apartment-scale gear.",
    icon: Zap,
  },
  {
    key: "small_office",
    label: SITE_TYPE_LABELS.small_office,
    blurb: "10-100 staff, single floor, primary uplink.",
    icon: Users,
  },
  {
    key: "msp_client",
    label: SITE_TYPE_LABELS.msp_client,
    blurb: "Repeatable client deployment with structured cabling.",
    icon: Building2,
  },
];

type Props = {
  value: ProfileInput | undefined;
  disabled: boolean;
  onNext: (profile: ProfileInput) => void;
};

export function WizardStepProfile({ value, disabled, onNext }: Props) {
  const [siteType, setSiteType] = useState<SiteType>(value?.siteType ?? "home");
  const [deviceCount, setDeviceCount] = useState(value?.deviceCount ?? 25);
  const [poeBudgetW, setPoeBudgetW] = useState(value?.poeBudgetW ?? 100);
  const [uplinkSpeed, setUplinkSpeed] = useState<UplinkSpeed>(
    value?.uplinkSpeed ?? "1G",
  );
  const [growthMultiplier, setGrowthMultiplier] = useState(
    value?.growthMultiplier ?? 1.5,
  );

  const submit = () => {
    onNext({
      siteType,
      deviceCount,
      poeBudgetW,
      uplinkSpeed,
      growthMultiplier,
    });
  };

  return (
    <fieldset disabled={disabled} className="space-y-8">
      <section className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white">
          Tell us about the site
        </h3>
        <p className="mt-1 text-sm text-white/50">
          We use this to size racks, switches, and power.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SITE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = siteType === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSiteType(opt.key)}
                aria-pressed={active}
                className={twMerge(
                  "flex flex-col rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-primary/60 bg-primary/10 text-white"
                    : "border-white/[0.08] bg-white/[0.02] text-white/70 hover:border-white/20",
                )}
              >
                <Icon className="mb-2 h-5 w-5 text-primary" aria-hidden />
                <span className="font-medium">{opt.label}</span>
                <span className="mt-1 text-xs text-white/50">{opt.blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white">Capacity inputs</h3>

        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <InlineHelp
              htmlFor="device-count"
              help="Total endpoints across wired + wireless. Rough estimate is fine."
            >
              Device count
            </InlineHelp>
            <input
              id="device-count"
              type="number"
              min={1}
              max={1000}
              value={deviceCount}
              onChange={(e) => setDeviceCount(Number(e.target.value) || 0)}
              className="glass-input w-full rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <InlineHelp htmlFor="poe-budget" term="POE">
              PoE budget (W)
            </InlineHelp>
            <input
              id="poe-budget"
              type="number"
              min={0}
              max={10000}
              value={poeBudgetW}
              onChange={(e) => setPoeBudgetW(Number(e.target.value) || 0)}
              className="glass-input w-full rounded-lg px-3 py-2 text-white"
            />
            <p className="mt-1 text-xs text-white/40">
              Sum of expected PoE draw across APs, cameras, phones.
            </p>
          </div>

          <div>
            <InlineHelp htmlFor="uplink-speed" term="UPLINK">
              Uplink speed
            </InlineHelp>
            <Select
              id="uplink-speed"
              value={uplinkSpeed}
              onValueChange={(v) => setUplinkSpeed(v as UplinkSpeed)}
            >
              {(Object.keys(UPLINK_LABELS) as UplinkSpeed[]).map((s) => (
                <SelectOption key={s} value={s}>
                  {UPLINK_LABELS[s]}
                </SelectOption>
              ))}
            </Select>
          </div>

          <div>
            <InlineHelp
              htmlFor="growth"
              help="3-year growth multiplier. 1.5× = +50% capacity in 3 years."
            >
              Growth multiplier
            </InlineHelp>
            <input
              id="growth"
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={growthMultiplier}
              onChange={(e) => setGrowthMultiplier(Number(e.target.value))}
              aria-valuetext={`${growthMultiplier.toFixed(1)} times`}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-white/40">
              <span>1.0×</span>
              <span className="text-white/80">
                {growthMultiplier.toFixed(1)}×
              </span>
              <span>3.0×</span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={disabled || deviceCount <= 0}
          className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          Generate topology →
        </button>
      </div>
    </fieldset>
  );
}
