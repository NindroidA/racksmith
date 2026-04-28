"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import toast from "react-hot-toast";
import type { OAuthProviders } from "@/lib/oauth-providers";
import { GithubIcon, GoogleIcon } from "@/components/ui/oauth-icons";
import { AuthShell } from "@/components/layout/auth-shell";
import { describeError } from "@/lib/error-message";

export function LoginForm({ oauth }: { oauth: OAuthProviders }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const hasOAuth = oauth.github || oauth.google;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        toast.error(result.error.message || "Failed to sign in");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      toast.error(describeError(err, "Failed to sign in"));
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "github" | "google") {
    try {
      await signIn.social({ provider, callbackURL: "/dashboard" });
    } catch (err) {
      toast.error(describeError(err, "Failed to sign in"));
    }
  }

  return (
    <AuthShell title="Sign in to your account">
      {hasOAuth && (
        <>
          <div className="mb-6 flex flex-col gap-3">
            {oauth.github && (
              <button
                onClick={() => handleOAuth("github")}
                className="glass-button flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
              >
                <GithubIcon className="h-4 w-4" />
                Continue with GitHub
              </button>
            )}
            {oauth.google && (
              <button
                onClick={() => handleOAuth("google")}
                className="glass-button flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
              >
                <GoogleIcon className="h-4 w-4" />
                Continue with Google
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

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/70"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-white/50 transition-colors hover:text-primary"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full rounded-lg py-2.5 pl-10 pr-4 text-sm"
              placeholder="Enter your password"
              autoComplete="current-password"
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
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
