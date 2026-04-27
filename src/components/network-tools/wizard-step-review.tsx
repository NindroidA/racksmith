"use client";

import {
  ArrowLeft,
  Globe,
  HardDrive,
  Layers,
  Loader2,
  Server,
  Tag,
} from "lucide-react";
import type { WizardInputs } from "@/lib/plan/wizard-types";

type Props = {
  inputs: WizardInputs;
  disabled: boolean;
  pending: boolean;
  onBack: () => void;
  onApply: () => void;
};

export function WizardStepReview({
  inputs,
  disabled,
  pending,
  onBack,
  onApply,
}: Props) {
  const incomplete = !inputs.profile || !inputs.topology;
  const deviceCount = inputs.topology?.selected.length ?? 0;
  const vlanCount = inputs.network?.vlans.length ?? 0;
  const subnetCount = vlanCount; // 1 subnet per VLAN

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white">Plan summary</h3>
        <p className="mt-1 text-sm text-white/50">
          Applying creates real records — racks, devices, VLANs, and subnets in
          one transaction.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCell icon={Server} label="Rack" value="1" />
          <SummaryCell
            icon={HardDrive}
            label="Devices"
            value={String(deviceCount)}
          />
          <SummaryCell icon={Tag} label="VLANs" value={String(vlanCount)} />
          <SummaryCell
            icon={Globe}
            label="Subnets"
            value={String(subnetCount)}
          />
        </div>
      </section>

      {inputs.topology && (
        <section className="glass-card rounded-xl p-6">
          <h3 className="text-base font-semibold text-white">
            Equipment list ({inputs.topology.rackName} ·{" "}
            {inputs.topology.rackSizeU}U)
          </h3>
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {inputs.topology.selected.map((d, idx) => (
              <li
                key={`${d.manufacturer}-${d.model}-${idx}`}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div>
                  <span className="font-medium text-white">
                    {d.manufacturer} {d.model}
                  </span>
                  <span className="ml-2 text-xs text-white/40">
                    {d.deviceType} · {d.sizeU > 0 ? `${d.sizeU}U` : "0U"} ·{" "}
                    {d.portCount} ports
                  </span>
                </div>
                {d.powerWatts !== null && (
                  <span className="text-xs text-white/50">
                    ~{d.powerWatts}W
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {inputs.network && inputs.network.vlans.length > 0 && (
        <section className="glass-card rounded-xl p-6">
          <h3 className="text-base font-semibold text-white">
            VLAN + IP plan ({inputs.network.parentCidr})
          </h3>
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {inputs.network.vlans.map((v) => (
              <li
                key={`${v.vlanId}`}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-white/70">
                    VLAN {v.vlanId}
                  </span>
                  <span className="font-medium text-white">{v.name}</span>
                  <span className="text-xs text-white/40">{v.purpose}</span>
                </div>
                <span className="font-mono text-xs text-white/60">
                  /24 at suffix .{v.subnetSuffix}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="btn-secondary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={disabled || incomplete || pending}
          aria-busy={pending}
          aria-describedby="apply-status"
          className="btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {pending ? "Materializing…" : "Apply plan"}
          <Layers className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p id="apply-status" aria-live="polite" className="sr-only">
        {pending ? "Applying plan, please wait." : ""}
      </p>
    </div>
  );
}

function SummaryCell({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Server;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/40">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
