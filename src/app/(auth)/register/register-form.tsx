"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import toast from "react-hot-toast";
import type { OAuthProviders } from "@/lib/oauth-providers";
import { GithubIcon, GoogleIcon } from "@/components/ui/oauth-icons";
import { AuthShell } from "@/components/layout/auth-shell";
import { describeError } from "@/lib/error-message";

export function RegisterForm({ oauth }: { oauth: OAuthProviders }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const hasOAuth = oauth.github || oauth.google;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);

    if (password !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({ name, email, password });
      if (result.error) {
        const msg = (result.error.message ?? "").toLowerCase();
        const code = (result.error as { code?: string }).code ?? "";
        if (
          code === "USER_ALREADY_EXISTS" ||
          (msg.includes("already") && msg.includes("exist")) ||
          msg.includes("already in use")
        ) {
          setEmailError(
            "An account with this email already exists. Try signing in instead.",
          );
          return;
        }
        toast.error(result.error.message || "Failed to create account");
      } else {
        toast.success("Account created!");
        router.push("/dashboard");
      }
    } catch (err) {
      toast.error(describeError(err, "Failed to create account"));
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "github" | "google") {
    try {
      await signIn.social({ provider, callbackURL: "/dashboard" });
    } catch (err) {
      toast.error(describeError(err, "Failed to sign up"));
    }
  }

  return (
    <AuthShell title="Create your account">
      {hasOAuth && (
        <>
          <div className="mb-6 flex flex-col gap-3">
            {oauth.github && (
              <button
                onClick={() => handleOAuth("github")}
                className="glass-button flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
              >
                <GithubIcon className="h-4 w-4" />
                Sign up with GitHub
              </button>
            )}
            {oauth.google && (
              <button
                onClick={() => handleOAuth("google")}
                className="glass-button flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
              >
                <GoogleIcon className="h-4 w-4" />
                Sign up with Google
              </button>
            )}
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/40">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input w-full rounded-lg py-2.5 pl-10 pr-4 text-sm"
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </div>
        </div>

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
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              className="glass-input w-full rounded-lg py-2.5 pl-10 pr-4 text-sm"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "email-error" : undefined}
              required
            />
          </div>
          {emailError && (
            <p id="email-error" className="mt-1.5 text-xs text-accent-red">
              {emailError}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              className="glass-input w-full rounded-lg py-2.5 pl-10 pr-4 text-sm"
              placeholder="Min 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              className="glass-input w-full rounded-lg py-2.5 pl-10 pr-4 text-sm"
              placeholder="Re-enter password"
              autoComplete="new-password"
              minLength={8}
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? "password-error" : undefined}
              required
            />
          </div>
          {passwordError && (
            <p id="password-error" className="mt-1.5 text-xs text-accent-red">
              {passwordError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
