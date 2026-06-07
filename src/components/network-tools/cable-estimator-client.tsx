"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  PlugsConnected,
  Plus,
  TrashSimple,
} from "@phosphor-icons/react/dist/ssr";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/button";
import { Select, SelectOption } from "@/components/ui/select";
import {
  CABLE_SPECS,
  type CableMediaType,
  type LinkSpeed,
} from "@/lib/cable/limits";
import {
  buildBom,
  estimateCableLength,
  type EstimateResult,
} from "@/lib/cable/estimate";

const STATUS_COLOR: Record<string, string> = {
  ok: "text-accent-green",
  warning: "text-accent-orange",
  exceeded: "text-accent-red",
  speed_mismatch: "text-accent-red",
};

const STATUS_LED: Record<string, string> = {
  ok: "led-dot--green",
  warning: "led-dot--amber",
  exceeded: "led-dot--red",
  speed_mismatch: "led-dot--red",
};

type Row = {
  id: string;
  cableType: CableMediaType;
  linkSpeed: LinkSpeed;
  manualMeters: number;
};

const SPEED_OPTIONS: ReadonlyArray<LinkSpeed> = [
  "1G",
  "2.5G",
  "5G",
  "10G",
  "25G",
  "40G",
  "100G",
  "400G",
];

export function CableEstimatorClient() {
  // Per-instance row IDs. `useId` gives a stable instance prefix; `nextRow`
  // is bumped per `addRow` call. Replaces the previous module-scoped counter
  // (which leaked IDs across page mounts in a single SPA session).
  const idPrefix = useId();
  const nextRow = useRef(0);
  const makeRowId = () => {
    nextRow.current += 1;
    return `${idPrefix}-cable-${nextRow.current}`;
  };

  const [rows, setRows] = useState<Row[]>(() => [
    { id: makeRowId(), cableType: "cat6a", linkSpeed: "10G", manualMeters: 30 },
  ]);

  const evaluated = useMemo(
    () =>
      rows.map((r) => ({
        row: r,
        result: estimateCableLength({
          cableType: r.cableType,
          linkSpeed: r.linkSpeed,
          manualMeters: r.manualMeters,
        }),
      })),
    [rows],
  );

  const bom = useMemo(
    () =>
      buildBom(
        evaluated
          .filter((e) => e.result.status !== "speed_mismatch")
          .map((e) => ({
            cableType: e.row.cableType,
            recommendedMeters: e.result.recommendedMeters,
          })),
      ),
    [evaluated],
  );

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        id: makeRowId(),
        cableType: "cat6a",
        linkSpeed: "1G",
        manualMeters: 5,
      },
    ]);

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-8">
      <section className="surface-card p-6">
        <header className="mb-4 flex items-center gap-2">
          <PlugsConnected
            className="h-5 w-5 text-primary"
            weight="duotone"
            aria-hidden
          />
          <h2 className="text-lg font-semibold text-white">Cable runs</h2>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-white/40">
                <th scope="col" className="px-2 py-2">
                  Type
                </th>
                <th scope="col" className="px-2 py-2">
                  Speed
                </th>
                <th scope="col" className="px-2 py-2">
                  Length (m)
                </th>
                <th scope="col" className="px-2 py-2">
                  Buy length
                </th>
                <th scope="col" className="px-2 py-2">
                  Status
                </th>
                <th scope="col" className="px-2 py-2 sr-only">
                  Remove
                </th>
              </tr>
            </thead>
            <tbody>
              {evaluated.map(({ row, result }) => (
                <tr key={row.id} className="border-t border-white/[0.04]">
                  <td className="px-2 py-2">
                    <Select
                      value={row.cableType}
                      onValueChange={(v) =>
                        updateRow(row.id, { cableType: v as CableMediaType })
                      }
                      aria-label="Cable type"
                      className="px-2 py-1.5 text-sm"
                    >
                      {(Object.keys(CABLE_SPECS) as CableMediaType[]).map(
                        (t) => (
                          <SelectOption key={t} value={t}>
                            {CABLE_SPECS[t].label}
                          </SelectOption>
                        ),
                      )}
                    </Select>
                  </td>
                  <td className="px-2 py-2">
                    <Select
                      value={row.linkSpeed}
                      onValueChange={(v) =>
                        updateRow(row.id, { linkSpeed: v as LinkSpeed })
                      }
                      aria-label="Link speed"
                      className="px-2 py-1.5 text-sm"
                    >
                      {SPEED_OPTIONS.map((s) => (
                        <SelectOption key={s} value={s}>
                          {s}
                        </SelectOption>
                      ))}
                    </Select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={row.manualMeters}
                      onChange={(e) =>
                        updateRow(row.id, {
                          manualMeters: Math.max(
                            0,
                            Number(e.target.value) || 0,
                          ),
                        })
                      }
                      aria-label="Length in meters"
                      className="glass-input w-24 rounded-lg px-2 py-1.5 text-sm text-white"
                    />
                  </td>
                  <td className="px-2 py-2 text-white/70">
                    <span className="mono">{result.recommendedMeters}</span> m
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={twMerge(
                        "inline-flex items-center gap-1.5 text-xs font-medium uppercase",
                        STATUS_COLOR[result.status],
                      )}
                    >
                      <span
                        className={twMerge(
                          "led-dot",
                          STATUS_LED[result.status],
                        )}
                        aria-hidden
                      />
                      {result.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      aria-label={`Remove ${CABLE_SPECS[row.cableType].label} cable run`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-accent-red/10 hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55"
                    >
                      <TrashSimple className="h-4 w-4" weight="bold" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={addRow}
          className="mt-3"
          iconLeft={<Plus className="h-3.5 w-3.5" weight="bold" aria-hidden />}
        >
          Add cable run
        </Button>

        <NotesList evaluated={evaluated} />
      </section>

      <section className="surface-card p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">
          Bill of materials
        </h2>
        {bom.length === 0 ? (
          <p className="text-sm text-white/50">
            Add a cable run above. Speed-mismatched runs are excluded.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {bom.map((line) => (
              <li
                key={`${line.cableType}-${line.lengthMeters}`}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span className="text-white">
                  {CABLE_SPECS[line.cableType].label}{" "}
                  <span className="text-white/40">·</span>{" "}
                  <span className="mono">{line.lengthMeters}</span> m
                </span>
                <span className="text-white/60">
                  × <span className="mono">{line.count}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NotesList({
  evaluated,
}: {
  evaluated: ReadonlyArray<{ row: Row; result: EstimateResult }>;
}) {
  const notes = evaluated.flatMap(({ row, result }) =>
    result.notes.map((note) => ({ key: `${row.id}-${note}`, note })),
  );
  if (notes.length === 0) return null;
  return (
    <ul
      aria-live="polite"
      aria-label="Cable run advisories"
      className="mt-4 space-y-2"
    >
      {notes.map((n) => (
        <li
          key={n.key}
          className="rounded-lg border border-accent-orange/20 bg-accent-orange/[0.06] px-3 py-2 text-xs text-accent-orange/90"
        >
          {n.note}
        </li>
      ))}
    </ul>
  );
}
