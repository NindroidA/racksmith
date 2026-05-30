"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Broadcast,
  WarningCircle,
  CircleNotch,
} from "@phosphor-icons/react/dist/ssr";
import { describeError } from "@/lib/error-message";

type Props = {
  defaultSubnet?: string;
  disabled?: boolean;
};

export function ScanStarter({ defaultSubnet, disabled }: Props) {
  const router = useRouter();
  const [subnet, setSubnet] = useState(defaultSubnet ?? "192.168.1.0/24");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStart() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/discovery/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subnet }),
        });
        const data = await res.json();
        if (!res.ok) {
          // /api/discovery/scan returns the v1 error envelope:
          // { error: { code, message, fields, requestId } }
          setError(data?.error?.message || "Failed to start scan");
          return;
        }
        toast.success("Scan started — this page will update when complete.");
        router.refresh();
      } catch (err) {
        setError(describeError(err, "Failed to start scan"));
      }
    });
  }

  return (
    <div className="surface-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Broadcast className="h-5 w-5 text-accent-green" weight="duotone" />
        <h2 className="text-lg font-semibold text-white">Scan a network</h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!pending && !disabled) handleStart();
        }}
        className="flex flex-col gap-3 md:flex-row md:items-start"
      >
        <div className="flex-1">
          <label
            htmlFor="subnet"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Subnet (CIDR)
          </label>
          <input
            id="subnet"
            type="text"
            value={subnet}
            onChange={(e) => setSubnet(e.target.value)}
            disabled={pending || disabled}
            className="glass-input w-full rounded-lg px-4 py-2.5 font-mono text-sm"
            placeholder="192.168.1.0/24"
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs text-white/40">
            Uses <span className="mono">nmap -sn</span> ping scan. Fast, no
            privileges required. Max /16.
          </p>
        </div>

        <button
          type="submit"
          disabled={pending || disabled}
          aria-busy={pending}
          className="mt-0 flex items-center gap-2 self-stretch rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50 md:mt-[22px] md:self-start"
        >
          {pending ? (
            <>
              <CircleNotch
                className="h-4 w-4 animate-spin"
                weight="duotone"
                aria-hidden
              />
              Starting...
            </>
          ) : (
            <>
              <Broadcast className="h-4 w-4" weight="duotone" aria-hidden />
              Start Scan
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-sm text-accent-red">
          <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="duotone" />
          <span>{error}</span>
        </div>
      )}

      {disabled && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/60">
          A scan is already running. Cancel it first or wait for it to finish.
        </div>
      )}
    </div>
  );
}
