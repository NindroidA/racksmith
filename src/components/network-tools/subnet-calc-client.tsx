"use client";

import { useMemo, useState } from "react";
import { Calculator, Copy, Check, Plus, Trash2, Split } from "lucide-react";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";
import {
  calculateCidr,
  ipv4NetMask,
  ipv4ToBinary,
  ipv4Wildcard,
  isValidCidr,
  vlsmSplit,
  type ParsedCidr,
  type VlsmAllocation,
} from "@/lib/ip";
import { describeError } from "@/lib/error-message";

export function SubnetCalcClient() {
  const [cidr, setCidr] = useState("192.168.1.0/24");

  const result = useMemo<
    { ok: true; details: ParsedCidr } | { ok: false; error: string }
  >(() => {
    const trimmed = cidr.trim();
    if (!trimmed) return { ok: false, error: "" };
    if (!isValidCidr(trimmed)) {
      return {
        ok: false,
        error: "Invalid CIDR. Try 192.168.1.0/24 or 2001:db8::/48.",
      };
    }
    try {
      return { ok: true, details: calculateCidr(trimmed) };
    } catch (err) {
      return {
        ok: false,
        error: describeError(err, "Couldn't parse"),
      };
    }
  }, [cidr]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
          <Calculator className="h-7 w-7 text-primary" aria-hidden />
          Subnet Calculator
        </h1>
        <p className="mt-1 text-white/60">
          IPv4 + IPv6 math. Split with VLSM. No data is stored — just number
          crunching.
        </p>
      </div>

      <div className="glass-card rounded-xl p-6">
        <label
          htmlFor="cidr-input"
          className="mb-1.5 block text-sm font-medium text-white/70"
        >
          CIDR
        </label>
        <input
          id="cidr-input"
          type="text"
          value={cidr}
          onChange={(e) => setCidr(e.target.value)}
          autoFocus
          spellCheck={false}
          aria-invalid={!result.ok && cidr.trim() !== ""}
          aria-describedby={
            !result.ok && cidr.trim() !== "" ? "cidr-error" : undefined
          }
          className="glass-input w-full rounded-lg px-4 py-3 font-mono text-base"
          placeholder="192.168.1.0/24"
        />
        {!result.ok && cidr.trim() !== "" && (
          <p
            id="cidr-error"
            role="alert"
            className="mt-2 text-sm text-accent-red"
          >
            {result.error}
          </p>
        )}
      </div>

      {result.ok && <ResultCard details={result.details} />}
      {result.ok && <VlsmSplitter parent={result.details} />}
    </div>
  );
}

function ResultCard({ details }: { details: ParsedCidr }) {
  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "Type", value: details.kind.toUpperCase() },
    { label: "CIDR", value: details.cidr, mono: true },
    { label: "Prefix", value: `/${details.prefix}` },
    { label: "Network", value: details.network, mono: true },
    ...(details.broadcast
      ? [{ label: "Broadcast", value: details.broadcast, mono: true }]
      : []),
    ...(details.kind === "ipv4"
      ? [
          { label: "Netmask", value: ipv4NetMask(details.prefix), mono: true },
          {
            label: "Wildcard",
            value: ipv4Wildcard(details.prefix),
            mono: true,
          },
        ]
      : []),
    ...(details.firstUsable
      ? [
          {
            label: "First usable",
            value: details.firstUsable,
            mono: true,
          },
        ]
      : []),
    ...(details.lastUsable
      ? [{ label: "Last usable", value: details.lastUsable, mono: true }]
      : []),
    {
      label: "Total addresses",
      value: formatBig(details.totalHosts),
    },
    {
      label: "Usable hosts",
      value: formatBig(details.usableHosts),
    },
  ];

  return (
    <section className="glass-card rounded-xl p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">Subnet details</h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between gap-4"
          >
            <dt className="text-sm text-white/50">{r.label}</dt>
            <dd className="flex items-center gap-2">
              <span
                className={twMerge("text-sm text-white", r.mono && "font-mono")}
              >
                {r.value}
              </span>
              <CopyButton value={r.value} />
            </dd>
          </div>
        ))}
      </dl>

      {details.kind === "ipv4" && (
        <div className="mt-5 rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="mb-1 text-xs uppercase tracking-wider text-white/40">
            Network in binary
          </div>
          <code className="block break-all font-mono text-xs text-white/80">
            {ipv4ToBinary(details.network)}
          </code>
        </div>
      )}
    </section>
  );
}

type Requirement = { id: string; name: string; hosts: string };

function VlsmSplitter({ parent }: { parent: ParsedCidr }) {
  const [requirements, setRequirements] = useState<Requirement[]>([
    { id: "r1", name: "Mgmt", hosts: "50" },
    { id: "r2", name: "Users", hosts: "100" },
  ]);

  const update = (id: string, patch: Partial<Requirement>) =>
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );

  const add = () =>
    setRequirements((prev) => [
      ...prev,
      { id: `r${prev.length + 1}-${Date.now()}`, name: "", hosts: "10" },
    ]);

  const remove = (id: string) =>
    setRequirements((prev) => prev.filter((r) => r.id !== id));

  const result = useMemo(() => {
    const reqs = requirements
      .filter((r) => r.name.trim() && r.hosts.trim())
      .map((r) => ({
        name: r.name.trim(),
        hosts: Math.max(0, parseInt(r.hosts, 10) || 0),
      }));
    if (reqs.length === 0) return null;
    return vlsmSplit(parent.cidr, reqs);
  }, [requirements, parent.cidr]);

  return (
    <section className="glass-card rounded-xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Split className="h-5 w-5 text-accent-purple" aria-hidden />
        <h2 className="text-lg font-semibold text-white">VLSM splitter</h2>
      </div>
      <p className="mb-4 text-sm text-white/50">
        Divide {parent.cidr} into variable-length subnets sized to each
        requirement.
      </p>

      <div className="space-y-2">
        {requirements.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_120px_32px] items-center gap-2"
          >
            <input
              type="text"
              value={r.name}
              onChange={(e) => update(r.id, { name: e.target.value })}
              placeholder="Segment name (e.g. Users, IoT)"
              aria-label={`Segment ${r.id} name`}
              className="glass-input rounded-lg px-3 py-2 text-sm"
              maxLength={40}
            />
            <input
              type="number"
              value={r.hosts}
              onChange={(e) => update(r.id, { hosts: e.target.value })}
              placeholder="hosts"
              aria-label={`Segment ${r.name || r.id} host count`}
              min={0}
              max={1_000_000}
              className="glass-input rounded-lg px-3 py-2 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => remove(r.id)}
              aria-label={`Remove ${r.name || "requirement"}`}
              disabled={requirements.length <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-accent-red disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="glass-button mt-3 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Add segment
      </button>

      {result && !result.ok && (
        <div className="mt-4 rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
          {result.error}
        </div>
      )}

      {result?.ok && result.allocations.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">CIDR</th>
                <th className="px-4 py-2 font-medium">Range</th>
                <th className="px-4 py-2 font-medium text-right">Usable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {result.allocations.map((a) => (
                <AllocationRow key={a.name} allocation={a} />
              ))}
            </tbody>
          </table>
          {result.unusedHosts > 0n && (
            <div className="border-t border-white/10 bg-white/[0.02] px-4 py-2 text-xs text-white/40">
              {formatBig(result.unusedHosts)} addresses unused
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function AllocationRow({ allocation: a }: { allocation: VlsmAllocation }) {
  return (
    <tr className="transition-colors hover:bg-white/[0.03]">
      <td className="px-4 py-2 text-white">{a.name}</td>
      <td className="px-4 py-2 font-mono text-white/90">{a.cidr}</td>
      <td className="px-4 py-2 font-mono text-xs text-white/60">
        {a.firstIp} – {a.lastIp}
      </td>
      <td className="px-4 py-2 text-right font-mono text-white/70">
        {formatBig(a.usableHosts)}
      </td>
    </tr>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${value}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("Copied", { duration: 1200 });
          setTimeout(() => setCopied(false), 1200);
        } catch {
          toast.error("Clipboard unavailable");
        }
      }}
      className="rounded p-1 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/80"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-accent-green" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}

function formatBig(n: bigint): string {
  if (n < 1_000_000n) return n.toString();
  if (n < 1_000_000_000n) return `${(Number(n) / 1_000_000).toFixed(1)}M`;
  if (n < 1_000_000_000_000n)
    return `${(Number(n) / 1_000_000_000).toFixed(1)}B`;
  // For very large values (IPv6), show scientific notation.
  return n.toLocaleString("en-US");
}
