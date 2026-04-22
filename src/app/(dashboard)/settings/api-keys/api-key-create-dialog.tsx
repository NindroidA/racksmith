"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Plus, Copy, Check } from "lucide-react";
import { createApiKey } from "./actions";
import { describeError } from "@/lib/error-message";

type Props = { disabled?: boolean };

export function ApiKeyCreateDialog({ disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setOpen(false);
    setName("");
    setRole("member");
    setExpiresInDays(null);
    setRevealed(null);
    setCopied(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      try {
        const res = await createApiKey({ name, role, expiresInDays });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setRevealed(res.data.cleartext);
      } catch (err) {
        toast.error(describeError(err, "Failed to create key"));
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Create API key
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={close}
        >
          <div
            className="glass-panel w-full max-w-md rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {!revealed ? (
              <form id="api-key-create" onSubmit={submit} className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  Create API key
                </h2>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">
                    Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={1}
                    maxLength={60}
                    className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                    placeholder="MSP onboarding integration"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "member" | "admin")}
                    className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="member" className="bg-neutral-900">
                      Member (read + create)
                    </option>
                    <option value="admin" className="bg-neutral-900">
                      Admin (full CRUD, including delete)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">
                    Expires
                  </label>
                  <select
                    value={expiresInDays ?? "never"}
                    onChange={(e) =>
                      setExpiresInDays(
                        e.target.value === "never" ? null : Number(e.target.value),
                      )
                    }
                    className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="never" className="bg-neutral-900">Never</option>
                    <option value="30" className="bg-neutral-900">30 days</option>
                    <option value="90" className="bg-neutral-900">90 days</option>
                    <option value="365" className="bg-neutral-900">1 year</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="glass-button rounded-lg px-3 py-2 text-xs font-medium text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="api-key-create"
                    disabled={pending}
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {pending ? "Creating…" : "Create key"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  Your new API key
                </h2>
                <div className="rounded-lg border border-accent-orange/40 bg-accent-orange/10 p-3 text-xs text-accent-orange">
                  <strong>This is the only time you&apos;ll see this key.</strong> Copy
                  it now — after you close this window it can never be retrieved.
                </div>
                <div className="glass-input overflow-hidden rounded-lg p-3 font-mono text-xs text-white break-all">
                  {revealed}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(revealed);
                      setCopied(true);
                      toast.success("Copied to clipboard");
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={close}
                    className="glass-button rounded-lg px-3 py-2 text-xs font-medium text-white"
                  >
                    I saved it
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
