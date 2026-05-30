"use client";

import { useState } from "react";
import Link from "next/link";
import { Envelope, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { authClient } from "@/lib/auth-client";
import toast from "react-hot-toast";
import { AuthShell } from "@/components/layout/auth-shell";
import { describeError } from "@/lib/error-message";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      if (result.error) {
        toast.error(result.error.message || "Something went wrong");
      } else {
        setSent(true);
      }
    } catch (err) {
      toast.error(describeError(err, "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={sent ? "Check your email" : "Reset your password"}>
      {sent ? (
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-green/15">
            <CheckCircle
              className="h-6 w-6 text-accent-green"
              weight="duotone"
            />
          </div>
          <p className="text-sm text-white/70">
            If an account exists for{" "}
            <span className="mono font-medium text-white">{email}</span>,
            we&apos;ve sent a password-reset link. It expires in 1 hour.
          </p>
          <p className="mt-4 text-xs text-white/40">
            Didn&apos;t get it? Check your spam folder or try again in a few
            minutes.
          </p>
          <Link
            href="/login"
            className="mt-6 text-sm text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="mb-2 text-sm text-white/60">
            Enter your email and we&apos;ll send you a link to choose a new
            password.
          </p>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-white/70"
            >
              Email
            </label>
            <div className="relative">
              <Envelope
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
                weight="duotone"
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input w-full rounded-lg py-2.5 pl-10 pr-4 text-sm"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>

          <Link
            href="/login"
            className="mt-2 text-center text-sm text-white/50 hover:text-white"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
