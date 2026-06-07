"use client";

import Link from "next/link";
import { Plus, PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import type { AssignmentLite } from "./subnet-types";

type Props = {
  assignments: AssignmentLite[];
  onEdit: (a: AssignmentLite) => void;
  onAdd: () => void;
};

const STATUS_TONES: Record<string, "success" | "warning" | "info" | "neutral"> =
  {
    assigned: "success",
    reserved: "warning",
    dhcp: "info",
  };

export function AssignmentList({ assignments, onEdit, onAdd }: Props) {
  return (
    <section className="surface-card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Assignments · <span className="mono">{assignments.length}</span>
        </h2>
        <Button
          variant="primary"
          size="sm"
          onClick={onAdd}
          iconLeft={<Plus className="h-3.5 w-3.5" weight="bold" aria-hidden />}
        >
          Assign IP
        </Button>
      </div>

      {assignments.length === 0 ? (
        <p className="text-sm text-white/50">
          Nothing assigned yet. Click any free cell in the grid above, or use
          &ldquo;Assign IP&rdquo;.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.06]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-white/40">
                  <th className="px-4 py-2 font-medium">IP</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Device</th>
                  <th className="px-4 py-2 font-medium">Notes</th>
                  <th className="w-12 px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {assignments.map((a) => (
                  <tr
                    key={a.id}
                    className="transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-2 mono text-white">{a.ipAddress}</td>
                    <td className="px-4 py-2">
                      <Tag
                        tone={STATUS_TONES[a.status] ?? "neutral"}
                        variant="subtle"
                        className="capitalize"
                      >
                        {a.status}
                      </Tag>
                    </td>
                    <td className="px-4 py-2">
                      {a.device ? (
                        <Link
                          href={`/devices/${a.device.id}`}
                          className="text-white/80 hover:text-primary"
                        >
                          {a.device.name}
                        </Link>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-white/60">
                      {a.notes || <span className="text-white/30">—</span>}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onEdit(a)}
                        aria-label={`Edit assignment for ${a.ipAddress}`}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-white/40 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                      >
                        <PencilSimple
                          className="h-3.5 w-3.5"
                          weight="bold"
                          aria-hidden
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
