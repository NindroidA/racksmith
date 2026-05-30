"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  TrashSimple,
} from "@phosphor-icons/react/dist/ssr";
import { InlineHelp } from "@/components/ui/inline-help";
import { Select, SelectOption } from "@/components/ui/select";
import type { NetworkInput, VlanLine } from "@/lib/plan/wizard-types";
import { VLAN_PURPOSES as VLAN_PURPOSE_VALUES } from "@/lib/validators";

// Re-typed to const-readonly tuple so React inputs accept it as the option
// list; the source of truth is `validators.ts`.
const VLAN_PURPOSES = VLAN_PURPOSE_VALUES;

const STARTER_VLANS: ReadonlyArray<VlanLine> = [
  { vlanId: 10, name: "Management", purpose: "management", subnetSuffix: 10 },
  { vlanId: 20, name: "Users", purpose: "user", subnetSuffix: 20 },
  { vlanId: 30, name: "IoT", purpose: "iot", subnetSuffix: 30 },
  { vlanId: 40, name: "Guest", purpose: "guest", subnetSuffix: 40 },
];

type Props = {
  value: NetworkInput | undefined;
  disabled: boolean;
  onBack: () => void;
  onNext: (network: NetworkInput) => void;
};

export function WizardStepNetwork({ value, disabled, onBack, onNext }: Props) {
  const [parentCidr, setParentCidr] = useState(
    value?.parentCidr ?? "10.0.0.0/16",
  );
  const [vlans, setVlans] = useState<VlanLine[]>(
    value?.vlans ? [...value.vlans] : [...STARTER_VLANS],
  );
  // Parallel array of stable keys so React reconciliation survives both
  // row removal (the row beneath shouldn't reuse the removed row's DOM)
  // and edits to the user-controlled `vlanId` (which can't double as a key
  // — it changes every keystroke).
  const rowIdCounterRef = useRef(0);
  const [rowKeys, setRowKeys] = useState<string[]>(() =>
    vlans.map(() => `vlan-row-${rowIdCounterRef.current++}`),
  );

  const addRow = () => {
    setVlans((prev) => [
      ...prev,
      {
        vlanId: nextVlanId(prev),
        name: "New VLAN",
        purpose: "user",
        subnetSuffix: nextSuffix(prev),
      },
    ]);
    setRowKeys((prev) => [...prev, `vlan-row-${rowIdCounterRef.current++}`]);
  };

  const removeRow = (idx: number) => {
    setVlans((prev) => prev.filter((_, i) => i !== idx));
    setRowKeys((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, patch: Partial<VlanLine>) => {
    setVlans((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  };

  const submit = () => onNext({ parentCidr, vlans });

  const valid =
    parentCidr.trim() !== "" &&
    vlans.every(
      (v) => v.name.trim() !== "" && v.vlanId >= 1 && v.vlanId <= 4094,
    );

  return (
    <fieldset disabled={disabled} className="space-y-6">
      <section className="surface-card p-6">
        <h3 className="text-lg font-semibold text-white">
          Parent address space
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Each VLAN below gets a /24 sliced out of this CIDR by replacing the
          third octet.
        </p>
        <div className="mt-4 max-w-xs">
          <InlineHelp htmlFor="parent-cidr" term="CIDR">
            Parent CIDR (IPv4)
          </InlineHelp>
          <input
            id="parent-cidr"
            type="text"
            value={parentCidr}
            onChange={(e) => setParentCidr(e.target.value)}
            className="glass-input mono w-full rounded-lg px-3 py-2 text-white"
          />
        </div>
      </section>

      <section className="surface-card p-6">
        <header className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              VLANs to create
            </h3>
            <p className="mt-1 text-sm text-white/50">
              Skip the network step entirely by removing every row.
            </p>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
          >
            <Plus className="h-3.5 w-3.5" weight="bold" /> Add VLAN
          </button>
        </header>

        {vlans.length === 0 ? (
          <p className="text-sm text-white/50">
            No VLANs will be created. Click "Add VLAN" to start.
          </p>
        ) : (
          <ul className="space-y-3">
            {vlans.map((row, idx) => {
              const rowLabel = row.name || `row ${idx + 1}`;
              return (
                <li
                  key={rowKeys[idx]}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-white/[0.06] p-3 sm:grid-cols-[80px_1fr_140px_120px_36px]"
                >
                  <input
                    type="number"
                    min={1}
                    max={4094}
                    value={row.vlanId}
                    onChange={(e) =>
                      updateRow(idx, { vlanId: Number(e.target.value) || 1 })
                    }
                    className="glass-input mono rounded-lg px-2 py-1.5 text-sm text-white"
                    aria-label={`VLAN ID for ${rowLabel}`}
                  />
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(idx, { name: e.target.value })}
                    maxLength={40}
                    placeholder="VLAN name"
                    className="glass-input rounded-lg px-2 py-1.5 text-sm text-white"
                    aria-label={`Name for VLAN ${row.vlanId}`}
                  />
                  <Select
                    value={row.purpose}
                    onValueChange={(v) =>
                      updateRow(idx, { purpose: v as VlanLine["purpose"] })
                    }
                    className="px-2 py-1.5 text-sm"
                    aria-label={`Purpose for VLAN ${row.vlanId}`}
                  >
                    {VLAN_PURPOSES.map((p) => (
                      <SelectOption key={p} value={p}>
                        {p}
                      </SelectOption>
                    ))}
                  </Select>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={row.subnetSuffix}
                    onChange={(e) =>
                      updateRow(idx, {
                        subnetSuffix: Math.max(
                          0,
                          Math.min(255, Number(e.target.value) || 0),
                        ),
                      })
                    }
                    className="glass-input mono rounded-lg px-2 py-1.5 text-sm text-white"
                    aria-label={`Subnet suffix for VLAN ${row.vlanId}`}
                    title="Replaces the third octet of the parent CIDR (parent /16 → x.y.SUFFIX.0/24)"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    aria-label={`Remove VLAN ${rowLabel}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <TrashSimple
                      className="h-4 w-4"
                      weight="bold"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" weight="bold" aria-hidden /> Back
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !valid}
          className="btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          Review <ArrowRight className="h-4 w-4" weight="bold" aria-hidden />
        </button>
      </div>
    </fieldset>
  );
}

function nextVlanId(rows: ReadonlyArray<VlanLine>): number {
  const ids = new Set(rows.map((r) => r.vlanId));
  for (let i = 50; i <= 4094; i++) if (!ids.has(i)) return i;
  return 100;
}

function nextSuffix(rows: ReadonlyArray<VlanLine>): number {
  const used = new Set(rows.map((r) => r.subnetSuffix));
  for (let i = 50; i <= 255; i++) if (!used.has(i)) return i;
  return 50;
}
