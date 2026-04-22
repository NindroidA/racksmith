"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Wrench, Mail, CheckCircle2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import toast from "react-hot-toast";
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
            {sent ? "Check your email" : "Reset your password"}
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-green/15">
              <CheckCircle2 className="h-6 w-6 text-accent-green" />
            </div>
            <p className="text-sm text-white/70">
              If an account exists for{" "}
              <span className="font-medium text-white">{email}</span>,
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
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
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
      </div>
    </motion.div>
  );
}
