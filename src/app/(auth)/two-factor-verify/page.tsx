"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Wrench, ShieldCheck, KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import toast from "react-hot-toast";
import { describeError } from "@/lib/error-message";

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);

    try {
      const result = useBackup
        ? await authClient.twoFactor.verifyBackupCode({
            code: code.trim(),
            trustDevice,
          })
        : await authClient.twoFactor.verifyTotp({
            code: code.trim(),
            trustDevice,
          });

      if (result.error) {
        toast.error(result.error.message || "Invalid code");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      toast.error(describeError(err, "Invalid code"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="glass-panel rounded-2xl p-8">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <Wrench className="h-7 w-7 text-primary" />
          </div>
          <h1 className="gradient-text text-2xl font-bold">RackSmith</h1>
          <p className="mt-1 text-sm text-white/50">
            {useBackup ? "Enter a backup code" : "Two-factor verification"}
          </p>
        </div>

        <div className="mb-5 flex items-center justify-center gap-2 text-sm text-white/60">
          {useBackup ? (
            <KeyRound className="h-4 w-4" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {useBackup
            ? "Enter one of your backup codes"
            : "Open your authenticator app and enter the 6-digit code"}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            value={code}
            onChange={(e) =>
              setCode(
                useBackup
                  ? e.target.value.toUpperCase().slice(0, 16)
                  : e.target.value.replace(/\D/g, "").slice(0, 6),
              )
            }
            className="glass-input rounded-lg px-4 py-3 text-center text-xl font-mono tracking-[0.3em]"
            placeholder={useBackup ? "XXXX-XXXX" : "000000"}
            inputMode={useBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            autoFocus
            required
          />

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-primary"
            />
            <span className="text-white/80">
              Trust this device for 30 days
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Verify and sign in"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setUseBackup(!useBackup);
              setCode("");
            }}
            className="text-white/50 transition-colors hover:text-primary"
          >
            {useBackup
              ? "Use authenticator code instead"
              : "Use a backup code instead"}
          </button>
          <Link
            href="/login"
            className="text-white/50 transition-colors hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
