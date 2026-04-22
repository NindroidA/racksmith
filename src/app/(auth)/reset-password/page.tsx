"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Wrench, Lock, AlertCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import toast from "react-hot-toast";
import { describeError } from "@/lib/error-message";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      toast.error("Missing reset token");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to reset password");
      } else {
        toast.success("Password updated. Please sign in.");
        router.push("/login");
      }
    } catch (err) {
      toast.error(
        describeError(err, "Failed to reset password"),
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-red/15">
            <AlertCircle className="h-6 w-6 text-accent-red" />
          </div>
        </div>
        <h1 className="mb-2 text-lg font-semibold text-white">
          Invalid reset link
        </h1>
        <p className="mb-6 text-sm text-white/60">
          This link is missing a reset token. Request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="text-sm text-primary hover:underline"
        >
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-8">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
          <Wrench className="h-7 w-7 text-primary" />
        </div>
        <h1 className="gradient-text text-2xl font-bold">RackSmith</h1>
        <p className="mt-1 text-sm text-white/50">Choose a new password</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            New password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full rounded-lg py-2.5 pl-10 pr-4 text-sm"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Confirm password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="glass-input w-full rounded-lg py-2.5 pl-10 pr-4 text-sm"
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Suspense fallback={null}>
        <ResetPasswordInner />
      </Suspense>
    </motion.div>
  );
}
