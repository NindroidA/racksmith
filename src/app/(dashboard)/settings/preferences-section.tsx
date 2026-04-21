"use client";

import { useState, useTransition } from "react";
import { Sliders, Network } from "lucide-react";
import toast from "react-hot-toast";
import { updatePreferences } from "./actions";

type Props = {
  initial: {
    defaultSubnet: string;
    scanInterval: number | null;
    sidebarCollapsed: boolean;
  };
};

export function PreferencesSection({ initial }: Props) {
  const [defaultSubnet, setDefaultSubnet] = useState(initial.defaultSubnet);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    initial.sidebarCollapsed,
  );
  const [isPending, startTransition] = useTransition();

  const changed =
    defaultSubnet !== initial.defaultSubnet ||
    sidebarCollapsed !== initial.sidebarCollapsed;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updatePreferences({
        defaultSubnet: defaultSubnet.trim() || null,
        scanInterval: null,
        sidebarCollapsed,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Preferences saved");
    });
  }

  return (
    <section className="glass-card rounded-xl p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
        <Sliders className="h-4 w-4 text-primary" />
        Preferences
      </h2>
      <p className="mb-6 text-sm text-white/50">
        Defaults for discovery and navigation.
      </p>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/70">
            Default subnet for auto-discovery
          </label>
          <div className="relative">
            <Network className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={defaultSubnet}
              onChange={(e) => setDefaultSubnet(e.target.value)}
              className="glass-input w-full rounded-lg py-2.5 pl-10 pr-4 text-sm font-mono"
              placeholder="192.168.1.0/24"
              maxLength={32}
            />
          </div>
          <p className="text-xs text-white/40">
            Pre-fills the subnet field on the discovery page. Leave blank to
            enter manually each time.
          </p>
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div>
            <div className="text-sm font-medium text-white">
              Collapse sidebar by default
            </div>
            <div className="text-xs text-white/40">
              Start each session with the nav sidebar collapsed.
            </div>
          </div>
          <input
            type="checkbox"
            checked={sidebarCollapsed}
            onChange={(e) => setSidebarCollapsed(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-primary"
          />
        </label>

        <div>
          <button
            type="submit"
            disabled={isPending || !changed}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </form>
    </section>
  );
}
