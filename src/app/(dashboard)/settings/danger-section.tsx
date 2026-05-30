"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Warning, TrashSimple } from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { describeError } from "@/lib/error-message";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

type Props = { email: string };

export function DangerSection({ email }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const expected = `delete ${email}`;

  async function handleDelete() {
    if (!password) {
      toast.error("Enter your current password to confirm");
      return;
    }
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
      toast.error(describeError(err, "Failed"));
      setLoading(false);
    }
  }

  function closeDialog() {
    if (loading) return;
    setOpen(false);
    setPassword("");
  }

  return (
    <section className="rounded-xl border border-accent-red/30 bg-accent-red/[0.04] p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
        <Warning
          className="h-4 w-4 text-accent-red"
          weight="duotone"
          aria-hidden
        />
        Danger zone
      </h2>
      <p className="mb-6 text-sm text-white/50">
        Permanently delete your account and all associated data. This cannot be
        undone.
      </p>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-accent-red/40 bg-accent-red/10 px-4 py-2.5 text-sm font-medium text-accent-red transition-colors hover:bg-accent-red/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/50"
      >
        <TrashSimple className="h-4 w-4" weight="bold" aria-hidden />
        Delete account
      </button>

      <DeleteConfirmDialog
        open={open}
        onClose={closeDialog}
        title="Delete account?"
        body={
          <div className="space-y-4">
            <p>
              This will permanently delete your account, all sites, racks,
              devices, topology connections, discovery scans, and audit logs.{" "}
              <span className="font-semibold text-white">
                There is no recovery.
              </span>
            </p>
            <div>
              <label
                htmlFor="danger-password"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                Current password
              </label>
              <input
                id="danger-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="glass-input w-full rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
          </div>
        }
        confirmLabel="Delete my account"
        requireTypeName={expected}
        pending={loading}
        onConfirm={handleDelete}
      />
    </section>
  );
}
