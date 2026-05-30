"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { applyVlanTemplate } from "@/app/(dashboard)/network-tools/vlans/actions";
import { VLAN_TEMPLATES } from "@/lib/config-gen/templates";

type ConfirmTarget = { id: string; label: string } | null;

export function VlanTemplateApplier() {
  const [pending, startTransition] = useTransition();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);

  const performApply = () => {
    if (!confirmTarget) return;
    const { id } = confirmTarget;
    setSubmittingId(id);
    startTransition(async () => {
      const result = await applyVlanTemplate(id);
      if (!result.ok) {
        toast.error(result.error);
        setSubmittingId(null);
        setConfirmTarget(null);
        return;
      }
      const skipMsg = result.data.skipped.length
        ? ` (${result.data.skipped.length} skipped)`
        : "";
      toast.success(`${result.data.created} VLAN(s) created${skipMsg}`);
      setSubmittingId(null);
      setConfirmTarget(null);
    });
  };

  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkle
          className="h-5 w-5 text-accent-purple"
          weight="duotone"
          aria-hidden
        />
        <h2 className="text-lg font-semibold text-white">Starter templates</h2>
      </div>
      <p className="mb-4 text-sm text-white/50">
        Pre-built VLAN schemes for common deployments. Apply one to seed your
        list; existing VLAN IDs are preserved.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {VLAN_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setConfirmTarget({ id: t.id, label: t.label })}
            disabled={pending}
            className="surface-card flex flex-col items-start gap-2 p-4 text-left transition-all disabled:cursor-wait disabled:opacity-60"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-semibold text-white">
                {t.label}
              </span>
              {submittingId === t.id && (
                <span className="text-xs text-white/50">Applying…</span>
              )}
            </div>
            <p className="text-xs text-white/50">{t.blurb}</p>
            <div className="mt-auto flex flex-wrap gap-1 pt-2">
              {t.entries.map((e) => (
                <span
                  key={e.vlanId}
                  className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/60"
                >
                  <span className="mono">{e.vlanId}</span> {e.name}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      <DeleteConfirmDialog
        open={confirmTarget !== null}
        onClose={() => !pending && setConfirmTarget(null)}
        title="Apply VLAN template?"
        body={
          <p>
            Apply the{" "}
            <span className="font-medium text-white">
              {confirmTarget?.label}
            </span>{" "}
            template? New VLANs will be created in your workspace. Any VLAN IDs
            that already exist are skipped — nothing is overwritten.
          </p>
        }
        confirmLabel="Apply template"
        pending={pending}
        onConfirm={performApply}
      />
    </section>
  );
}
