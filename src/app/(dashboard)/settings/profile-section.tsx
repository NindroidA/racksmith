"use client";

import { useState, useTransition } from "react";
import { User, Mail, ShieldCheck, AlertCircle, Send } from "lucide-react";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { updateProfile } from "./actions";
import { describeError } from "@/lib/error-message";

type Props = {
  initialName: string;
  email: string;
  emailVerified: boolean;
};

export function ProfileSection({ initialName, email, emailVerified }: Props) {
  const [name, setName] = useState(initialName);
  const [newEmail, setNewEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [emailLoading, setEmailLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  async function handleResend() {
    setResendLoading(true);
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/verify-email",
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to resend");
      } else {
        setResendSent(true);
        toast.success(`Verification link sent to ${email}`);
      }
    } catch (err) {
      toast.error(describeError(err, "Failed"));
    } finally {
      setResendLoading(false);
    }
  }

  function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateProfile({ name });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile updated");
    });
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || newEmail === email) return;

    setEmailLoading(true);
    try {
      const result = await authClient.changeEmail({
        newEmail,
        callbackURL: "/settings",
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to request change");
      } else {
        toast.success(
          emailVerified
            ? `Check ${email} to confirm the change`
            : "Email updated",
        );
        setNewEmail("");
      }
    } catch (err) {
      toast.error(describeError(err, "Failed"));
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <section className="glass-card rounded-xl p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
        <User className="h-4 w-4 text-primary" />
        Profile
      </h2>
      <p className="mb-6 text-sm text-white/50">
        Your display name and email address.
      </p>

      <form onSubmit={handleNameSave} className="mb-6 flex flex-col gap-2">
        <label className="text-sm font-medium text-white/70">Name</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input flex-1 rounded-lg px-4 py-2.5 text-sm"
            maxLength={100}
            autoComplete="name"
          />
          <button
            type="submit"
            disabled={isPending || name === initialName || !name.trim()}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-white/70">Email</label>
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm">
          <Mail className="h-4 w-4 text-white/40" />
          <span className="text-white">{email}</span>
          {emailVerified ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent-green/15 px-2 py-0.5 text-xs text-accent-green">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading || resendSent}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent-orange/15 px-2 py-0.5 text-xs text-accent-orange transition-colors hover:bg-accent-orange/20 disabled:opacity-60"
            >
              {resendSent ? (
                <>
                  <Send className="h-3 w-3" />
                  Link sent
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  {resendLoading ? "Sending…" : "Resend verification"}
                </>
              )}
            </button>
          )}
        </div>

        <form onSubmit={handleEmailChange} className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@example.com"
            className="glass-input flex-1 rounded-lg px-4 py-2.5 text-sm"
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={emailLoading || !newEmail || newEmail === email}
            className="rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.1] disabled:opacity-40"
          >
            {emailLoading ? "Requesting…" : "Change email"}
          </button>
        </form>
        <p className="text-xs text-white/40">
          We&apos;ll send a confirmation link to your current email.
        </p>
      </div>
    </section>
  );
}
