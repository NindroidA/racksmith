"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  TrashSimple,
  BatteryCharging,
  Lightning,
  Power,
} from "@phosphor-icons/react/dist/ssr";
import { twMerge } from "tailwind-merge";
import { InlineHelp } from "@/components/ui/inline-help";
import { AdvancedAccordion } from "@/components/ui/advanced-accordion";
import { Select, SelectOption } from "@/components/ui/select";
import { calculatePoeBudget, type PoeDeviceLine } from "@/lib/power/poe";
import { COMMON_PDU_CIRCUITS, calculatePduCapacity } from "@/lib/power/pdu";
import { calculateUpsRuntime } from "@/lib/power/ups";

const STATUS_COLOR: Record<string, string> = {
  ok: "text-accent-green",
  warning: "text-accent-orange",
  critical: "text-red-400",
  exceeded: "text-red-500",
};

const STATUS_LED: Record<string, string> = {
  ok: "led-dot--green",
  warning: "led-dot--amber",
  critical: "led-dot--red",
  exceeded: "led-dot--red",
};

export function PowerCalculatorClient() {
  return (
    <div className="space-y-8">
      <PoePanel />
      <PduPanel />
      <UpsPanel />
    </div>
  );
}

// ─── PoE budget panel ─────────────────────────────

function PoePanel() {
  const [budget, setBudget] = useState(370);
  const [headroomPct, setHeadroomPct] = useState(10);
  const [lines, setLines] = useState<PoeDeviceLine[]>([
    { label: "Wireless AP", count: 4, wattsEach: 20 },
    { label: "VoIP phone", count: 8, wattsEach: 7 },
    { label: "PoE camera", count: 2, wattsEach: 12 },
  ]);

  const result = useMemo(
    () => calculatePoeBudget(budget, lines, headroomPct / 100),
    [budget, headroomPct, lines],
  );

  const updateLine = (idx: number, patch: Partial<PoeDeviceLine>) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    );
  };

  const addLine = () =>
    setLines((prev) => [...prev, { label: "Device", count: 1, wattsEach: 10 }]);
  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  return (
    <section className="surface-card p-6">
      <header className="mb-4 flex items-center gap-2">
        <Lightning
          className="h-5 w-5 text-primary"
          weight="duotone"
          aria-hidden
        />
        <h2 className="text-lg font-semibold text-white">PoE budget</h2>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[200px_1fr]">
        <div>
          <InlineHelp htmlFor="poe-budget-input" term="POE">
            Switch budget (W)
          </InlineHelp>
          <input
            id="poe-budget-input"
            type="number"
            min={0}
            value={budget}
            onChange={(e) =>
              setBudget(Math.max(0, Number(e.target.value) || 0))
            }
            className="glass-input w-full rounded-lg px-3 py-2 text-white"
          />

          <div className="mt-4 rounded-lg border border-white/[0.08] p-3">
            <div className="text-[11px] uppercase tracking-wide text-white/40">
              Total draw
            </div>
            <div className="mt-1 text-2xl font-semibold text-white">
              <span className="mono">{result.totalDraw.toFixed(0)}W</span>
            </div>
            <div className="mt-1 text-xs text-white/50">
              of <span className="mono">{result.budget}W</span> budget
            </div>
            <div
              className={twMerge(
                "mt-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide",
                STATUS_COLOR[result.status],
              )}
            >
              <span
                className={twMerge("led-dot", STATUS_LED[result.status])}
                aria-hidden
              />
              {result.status} ·{" "}
              <span className="mono">
                {Math.round(result.pctOfBudget * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div>
          <ul className="space-y-2">
            {lines.map((line, idx) => (
              <li
                key={idx}
                className="grid grid-cols-[1fr_70px_70px_36px] gap-2 rounded-lg border border-white/[0.06] p-2"
              >
                <input
                  type="text"
                  value={line.label}
                  onChange={(e) => updateLine(idx, { label: e.target.value })}
                  className="glass-input rounded-lg px-2 py-1.5 text-sm text-white"
                  aria-label={`Device class name, row ${idx + 1}`}
                />
                <input
                  type="number"
                  min={0}
                  value={line.count}
                  onChange={(e) =>
                    updateLine(idx, {
                      count: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="glass-input rounded-lg px-2 py-1.5 text-sm text-white"
                  aria-label={`Count for ${line.label || `row ${idx + 1}`}`}
                />
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={line.wattsEach}
                  onChange={(e) =>
                    updateLine(idx, {
                      wattsEach: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="glass-input rounded-lg px-2 py-1.5 text-sm text-white"
                  aria-label={`Watts each for ${line.label || `row ${idx + 1}`}`}
                />
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  aria-label={`Remove ${line.label}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <TrashSimple className="h-4 w-4" weight="bold" />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={addLine}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/80 hover:bg-white/[0.08]"
          >
            <Plus className="h-3.5 w-3.5" weight="bold" aria-hidden /> Add
            device class
          </button>

          <AdvancedAccordion label="Advanced (headroom)" className="mt-4">
            <div>
              <InlineHelp
                htmlFor="headroom"
                help="Reserve a fraction of the budget for transient peaks. Industry default is 10%."
              >
                Headroom factor
              </InlineHelp>
              <input
                id="headroom"
                type="range"
                min={0}
                max={30}
                value={headroomPct}
                onChange={(e) => setHeadroomPct(Number(e.target.value))}
                aria-valuetext={`${headroomPct} percent`}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-white/40">
                <span>0%</span>
                <span className="text-white/80">
                  <span className="mono">{headroomPct}%</span>
                </span>
                <span>30%</span>
              </div>
              <p className="mt-2 text-xs text-white/50">
                Effective budget:{" "}
                <span className="mono">
                  {result.effectiveBudget.toFixed(0)}W
                </span>
              </p>
            </div>
          </AdvancedAccordion>
        </div>
      </div>
    </section>
  );
}

// ─── PDU sizing panel ─────────────────────────────

function PduPanel() {
  type CircuitOption = (typeof COMMON_PDU_CIRCUITS)[number];
  const [circuit, setCircuit] = useState<CircuitOption>(COMMON_PDU_CIRCUITS[1]); // 20A/120V default
  const [load, setLoad] = useState(1500);
  const result = useMemo(
    () =>
      calculatePduCapacity({ amps: circuit.amps, volts: circuit.volts }, load),
    [circuit, load],
  );

  return (
    <section className="surface-card p-6">
      <header className="mb-4 flex items-center gap-2">
        <Power className="h-5 w-5 text-primary" weight="duotone" aria-hidden />
        <h2 className="text-lg font-semibold text-white">
          PDU sizing (NEC 80% rule)
        </h2>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <InlineHelp htmlFor="pdu-circuit" term="PDU">
            Circuit
          </InlineHelp>
          <Select
            id="pdu-circuit"
            value={circuit.label}
            onValueChange={(v) => {
              const next = COMMON_PDU_CIRCUITS.find((c) => c.label === v);
              if (next) setCircuit(next);
            }}
          >
            {COMMON_PDU_CIRCUITS.map((c) => (
              <SelectOption key={c.label} value={c.label}>
                {c.label}
              </SelectOption>
            ))}
          </Select>

          <InlineHelp htmlFor="pdu-load" className="mt-4">
            Continuous load (W)
          </InlineHelp>
          <input
            id="pdu-load"
            type="number"
            min={0}
            value={load}
            onChange={(e) => setLoad(Math.max(0, Number(e.target.value) || 0))}
            className="glass-input w-full rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div className="rounded-lg border border-white/[0.08] p-4">
          <Stat
            label="Raw breaker capacity"
            value={`${result.rawCapacity.toFixed(0)}W`}
          />
          <Stat
            label="Continuous (80%) capacity"
            value={`${result.continuousCapacity.toFixed(0)}W`}
          />
          <Stat label="Load" value={`${load}W`} />
          <Stat
            label="% of continuous"
            value={`${Math.round(result.pctOfContinuous * 100)}%`}
            color={STATUS_COLOR[result.status]}
          />
          <Stat
            label="Status"
            value={result.status}
            color={STATUS_COLOR[result.status]}
            led={STATUS_LED[result.status]}
          />
        </div>
      </div>
    </section>
  );
}

// ─── UPS runtime panel ────────────────────────────

function UpsPanel() {
  const [batteryWh, setBatteryWh] = useState(1500);
  const [loadW, setLoadW] = useState(400);
  const [targetMin, setTargetMin] = useState(15);
  const [usableDoD, setUsableDoD] = useState(80);
  const [ageDerate, setAgeDerate] = useState(100);

  const result = useMemo(
    () =>
      calculateUpsRuntime(
        {
          mode: "wh",
          batteryWh,
          loadW: Math.max(1, loadW),
          usableDoD: usableDoD / 100,
          derateForAge: ageDerate / 100,
        },
        targetMin,
      ),
    [batteryWh, loadW, targetMin, usableDoD, ageDerate],
  );

  return (
    <section className="surface-card p-6">
      <header className="mb-4 flex items-center gap-2">
        <BatteryCharging
          className="h-5 w-5 text-primary"
          weight="duotone"
          aria-hidden
        />
        <h2 className="text-lg font-semibold text-white">UPS runtime</h2>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <InlineHelp htmlFor="ups-wh" term="UPS">
              Battery capacity (Wh)
            </InlineHelp>
            <input
              id="ups-wh"
              type="number"
              min={0}
              value={batteryWh}
              onChange={(e) =>
                setBatteryWh(Math.max(0, Number(e.target.value) || 0))
              }
              className="glass-input w-full rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <InlineHelp htmlFor="ups-load">Load (W)</InlineHelp>
            <input
              id="ups-load"
              type="number"
              min={1}
              value={loadW}
              onChange={(e) =>
                setLoadW(Math.max(1, Number(e.target.value) || 1))
              }
              className="glass-input w-full rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <InlineHelp
              htmlFor="ups-target"
              help="Runtime floor for grading. 15min covers a graceful shutdown for most homelabs."
            >
              Target runtime (min)
            </InlineHelp>
            <input
              id="ups-target"
              type="number"
              min={0}
              value={targetMin}
              onChange={(e) =>
                setTargetMin(Math.max(0, Number(e.target.value) || 0))
              }
              className="glass-input w-full rounded-lg px-3 py-2 text-white"
            />
          </div>

          <AdvancedAccordion label="Advanced (DoD + age)">
            <div>
              <InlineHelp htmlFor="ups-dod" term="DOD">
                Usable depth of discharge
              </InlineHelp>
              <input
                id="ups-dod"
                type="range"
                min={20}
                max={100}
                value={usableDoD}
                onChange={(e) => setUsableDoD(Number(e.target.value))}
                aria-valuetext={`${usableDoD} percent`}
                className="w-full"
              />
              <div className="text-xs text-white/50">
                <span className="mono">{usableDoD}%</span>
              </div>
            </div>

            <div>
              <InlineHelp
                htmlFor="ups-age"
                help="End-of-life capacity. Use 80% to plan around 3-year-old batteries."
              >
                Age derate
              </InlineHelp>
              <input
                id="ups-age"
                type="range"
                min={50}
                max={100}
                value={ageDerate}
                onChange={(e) => setAgeDerate(Number(e.target.value))}
                aria-valuetext={`${ageDerate} percent`}
                className="w-full"
              />
              <div className="text-xs text-white/50">
                <span className="mono">{ageDerate}%</span>
              </div>
            </div>
          </AdvancedAccordion>
        </div>

        <div className="rounded-lg border border-white/[0.08] p-4">
          <Stat
            label="Effective Wh"
            value={`${result.effectiveWh.toFixed(0)}Wh`}
          />
          <Stat
            label="Runtime"
            value={`${result.runtimeMinutes.toFixed(1)} min`}
            color={STATUS_COLOR[result.status]}
          />
          <Stat label="Target" value={`${targetMin} min`} />
          <Stat
            label="Status"
            value={result.status}
            color={STATUS_COLOR[result.status]}
            led={STATUS_LED[result.status]}
          />
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  color,
  led,
}: {
  label: string;
  value: string;
  color?: string;
  /** When set, render an LED dot before the value (for status rows). */
  led?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] py-2 text-sm last:border-0">
      <span className="text-white/50">{label}</span>
      <span
        className={twMerge(
          "flex items-center gap-1.5 font-medium text-white",
          color,
        )}
      >
        {led && <span className={twMerge("led-dot", led)} aria-hidden />}
        {led ? value : <span className="mono">{value}</span>}
      </span>
    </div>
  );
}
