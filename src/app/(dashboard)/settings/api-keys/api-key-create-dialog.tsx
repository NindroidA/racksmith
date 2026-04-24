"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Plus, Copy, Check, X } from "lucide-react";
import { createApiKey } from "./actions";
import { describeError } from "@/lib/error-message";
import { Select, SelectOption } from "@/components/ui/select";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type Props = { disabled?: boolean };

export function ApiKeyCreateDialog({ disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // close is stable within this component; pending determines dismissability
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pending]);

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
          onClick={() => !pending && close()}
        >
          <div
            ref={dialogRef}
            className="glass-panel w-full max-w-md rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            {!revealed ? (
              <form id="api-key-create" onSubmit={submit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 id={titleId} className="text-lg font-semibold text-white">
                    Create API key
                  </h2>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close dialog"
                    disabled={pending}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-1 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-50"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div>
                  <label
                    htmlFor="api-key-name"
                    className="mb-1.5 block text-xs font-medium text-white/60"
                  >
                    Name
                  </label>
                  <input
                    id="api-key-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={1}
                    maxLength={60}
                    autoFocus
                    className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                    placeholder="MSP onboarding integration"
                  />
                </div>
                <div>
                  <label
                    htmlFor="api-key-role"
                    className="mb-1.5 block text-xs font-medium text-white/60"
                  >
                    Role
                  </label>
                  <Select
                    id="api-key-role"
                    value={role}
                    onValueChange={(v) => setRole(v as "member" | "admin")}
                  >
                    <SelectOption value="member">
                      Member (read + create)
                    </SelectOption>
                    <SelectOption value="admin">
                      Admin (full CRUD, including delete)
                    </SelectOption>
                  </Select>
                </div>
                <div>
                  <label
                    htmlFor="api-key-expires"
                    className="mb-1.5 block text-xs font-medium text-white/60"
                  >
                    Expires
                  </label>
                  <Select
                    id="api-key-expires"
                    value={
                      expiresInDays == null ? "never" : String(expiresInDays)
                    }
                    onValueChange={(v) =>
                      setExpiresInDays(v === "never" ? null : Number(v))
                    }
                  >
                    <SelectOption value="never">Never</SelectOption>
                    <SelectOption value="30">30 days</SelectOption>
                    <SelectOption value="90">90 days</SelectOption>
                    <SelectOption value="365">1 year</SelectOption>
                  </Select>
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
                    aria-busy={pending}
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {pending ? "Creating…" : "Create key"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4" role="status" aria-live="assertive">
                <h2 id={titleId} className="text-lg font-semibold text-white">
                  Your new API key
                </h2>
                <div className="rounded-lg border border-accent-orange/40 bg-accent-orange/10 p-3 text-xs text-accent-orange">
                  <strong>
                    This is the only time you&apos;ll see this key.
                  </strong>{" "}
                  Copy it now — after you close this window it can never be
                  retrieved.
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
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
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
