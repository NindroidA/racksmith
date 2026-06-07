"use client";

import { useState, useTransition } from "react";
import {
  User,
  Envelope,
  ShieldCheck,
  WarningCircle,
  PaperPlaneTilt,
} from "@phosphor-icons/react/dist/ssr";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { updateProfile } from "./actions";
import { describeError } from "@/lib/error-message";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";

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
    <section className="surface-card p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
        <User className="h-4 w-4 text-primary" weight="duotone" />
        Profile
      </h2>
      <p className="mb-6 text-sm text-white/50">
        Your display name and email address.
      </p>

      <form onSubmit={handleNameSave} className="mb-6 flex flex-col gap-2">
        <label
          htmlFor="profile-name"
          className="text-sm font-medium text-white/70"
        >
          Name
        </label>
        <div className="flex gap-2">
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input flex-1 rounded-lg px-4 py-2.5 text-sm"
            maxLength={100}
            autoComplete="name"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={isPending || name === initialName || !name.trim()}
            loading={isPending}
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="profile-new-email"
          className="text-sm font-medium text-white/70"
        >
          Email
        </label>
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm">
          <Envelope className="h-4 w-4 text-white/40" weight="duotone" />
          <span className="mono text-white">{email}</span>
          {emailVerified ? (
            <Tag
              tone="success"
              className="ml-auto"
              iconLeft={<ShieldCheck className="h-3 w-3" weight="duotone" />}
            >
              Verified
            </Tag>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={resendLoading || resendSent}
              className="ml-auto text-accent-orange hover:text-accent-orange"
              iconLeft={
                resendSent ? (
                  <PaperPlaneTilt className="h-3 w-3" weight="bold" />
                ) : (
                  <WarningCircle className="h-3 w-3" weight="duotone" />
                )
              }
            >
              {resendSent
                ? "Link sent"
                : resendLoading
                  ? "Sending…"
                  : "Resend verification"}
            </Button>
          )}
        </div>

        <form onSubmit={handleEmailChange} className="flex gap-2">
          <input
            id="profile-new-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@example.com"
            aria-describedby="profile-email-hint"
            className="glass-input flex-1 rounded-lg px-4 py-2.5 text-sm"
            autoComplete="email"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={emailLoading || !newEmail || newEmail === email}
            loading={emailLoading}
          >
            {emailLoading ? "Requesting…" : "Change email"}
          </Button>
        </form>
        <p id="profile-email-hint" className="text-xs text-white/40">
          We&apos;ll send a confirmation link to your current email.
        </p>
      </div>
    </section>
  );
}
