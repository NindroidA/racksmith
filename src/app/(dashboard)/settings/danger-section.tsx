"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";

type Props = { email: string };

export function DangerSection({ email }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const expected = `delete ${email}`;
  const confirmMatches = confirm.trim().toLowerCase() === expected;

  async function handleDelete() {
    if (!confirmMatches || !password) return;
    setLoading(true);
    try {
      const result = await authClient.deleteUser({ password });
      if (result.error) {
        toast.error(result.error.message || "Failed to delete");
        setLoading(false);
        return;
      }
      toast.success("Account deleted");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-accent-red/30 bg-accent-red/[0.04] p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
        <AlertTriangle className="h-4 w-4 text-accent-red" />
        Danger zone
      </h2>
      <p className="mb-6 text-sm text-white/50">
        Permanently delete your account and all associated data. This cannot be
        undone.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-accent-red/40 bg-accent-red/10 px-4 py-2.5 text-sm font-medium text-accent-red transition-colors hover:bg-accent-red/15"
        >
          <Trash2 className="h-4 w-4" />
          Delete account
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-accent-red/30 bg-black/20 p-4">
          <p className="text-sm text-white/70">
            This will permanently delete your account, all sites, racks,
            devices, topology connections, discovery scans, and audit logs.{" "}
            <span className="font-semibold text-white">
              There is no recovery.
            </span>
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">
              Current password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input rounded-lg px-4 py-2.5 text-sm"
              autoComplete="current-password"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">
              Type{" "}
              <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-white">
                {expected}
              </code>{" "}
              to confirm
            </label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="glass-input rounded-lg px-4 py-2.5 text-sm"
              placeholder={expected}
              autoComplete="off"
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={!confirmMatches || !password || loading}
              className="rounded-lg bg-accent-red px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-red/90 disabled:opacity-40"
            >
              {loading ? "Deleting…" : "Delete my account"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setPassword("");
                setConfirm("");
              }}
              className="rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.1]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
