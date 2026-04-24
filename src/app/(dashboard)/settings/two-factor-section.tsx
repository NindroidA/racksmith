"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Download,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { describeError } from "@/lib/error-message";

type Props = { initialEnabled: boolean };

type EnableStage = "idle" | "password" | "scan" | "backup";

export function TwoFactorSection({ initialEnabled }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);

  const [stage, setStage] = useState<EnableStage>("idle");
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  const [regenOpen, setRegenOpen] = useState(false);
  const [regenPassword, setRegenPassword] = useState("");

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);

    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error) {
        toast.error(result.error.message || "Failed to enable 2FA");
        setLoading(false);
        return;
      }
      setTotpUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
      setStage("scan");
    } catch (err) {
      toast.error(describeError(err, "Failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (verifyCode.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator");
      return;
    }
    setLoading(true);

    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: verifyCode,
      });
      if (result.error) {
        toast.error(result.error.message || "Invalid code");
        setLoading(false);
        return;
      }
      setStage("backup");
    } catch (err) {
      toast.error(describeError(err, "Failed"));
    } finally {
      setLoading(false);
    }
  }

  function handleFinish() {
    setEnabled(true);
    setStage("idle");
    setPassword("");
    setVerifyCode("");
    setTotpUri("");
    setBackupCodes([]);
    toast.success("Two-factor authentication enabled");
    router.refresh();
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await authClient.twoFactor.disable({
        password: disablePassword,
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to disable 2FA");
      } else {
        setEnabled(false);
        setDisableOpen(false);
        setDisablePassword("");
        toast.success("Two-factor authentication disabled");
        router.refresh();
      }
    } catch (err) {
      toast.error(describeError(err, "Failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegen(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await authClient.twoFactor.generateBackupCodes({
        password: regenPassword,
      });
      if (result.error) {
        toast.error(result.error.message || "Failed");
      } else {
        setBackupCodes(result.data.backupCodes);
        setStage("backup");
        setRegenOpen(false);
        setRegenPassword("");
        toast.success("New backup codes generated");
      }
    } catch (err) {
      toast.error(describeError(err, "Failed"));
    } finally {
      setLoading(false);
    }
  }

  function copyCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadCodes() {
    const blob = new Blob(
      [
        `RackSmith backup codes\nGenerated: ${new Date().toISOString()}\n\nEach code can be used once. Keep this file somewhere safe.\n\n${backupCodes.join("\n")}\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "racksmith-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="glass-card rounded-xl p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
        {enabled ? (
          <ShieldCheck className="h-4 w-4 text-accent-green" />
        ) : (
          <ShieldAlert className="h-4 w-4 text-accent-orange" />
        )}
        Two-factor authentication
      </h2>
      <p className="mb-6 text-sm text-white/50">
        {enabled
          ? "Your account is protected with an authenticator app."
          : "Add a second sign-in step using Authy, Google Authenticator, 1Password, or any TOTP app."}
      </p>

      {enabled && stage === "idle" && !disableOpen && !regenOpen && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRegenOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.1]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Regenerate backup codes
          </button>
          <button
            type="button"
            onClick={() => setDisableOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-accent-red/40 bg-accent-red/10 px-4 py-2.5 text-sm font-medium text-accent-red transition-colors hover:bg-accent-red/15"
          >
            Disable 2FA
          </button>
        </div>
      )}

      {enabled && disableOpen && (
        <form onSubmit={handleDisable} className="flex flex-col gap-3">
          <label
            htmlFor="twofa-disable-pw"
            className="text-sm font-medium text-white/70"
          >
            Confirm with your password
          </label>
          <input
            id="twofa-disable-pw"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            className="glass-input rounded-lg px-4 py-2.5 text-sm"
            autoComplete="current-password"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !disablePassword}
              className="rounded-lg bg-accent-red px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-red/90 disabled:opacity-40"
            >
              {loading ? "Disabling…" : "Disable 2FA"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDisableOpen(false);
                setDisablePassword("");
              }}
              className="rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/70"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {enabled && regenOpen && (
        <form onSubmit={handleRegen} className="flex flex-col gap-3">
          <p className="text-sm text-white/60">
            Old backup codes will stop working immediately.
          </p>
          <label
            htmlFor="twofa-regen-pw"
            className="text-sm font-medium text-white/70"
          >
            Confirm with your password
          </label>
          <input
            id="twofa-regen-pw"
            type="password"
            value={regenPassword}
            onChange={(e) => setRegenPassword(e.target.value)}
            className="glass-input rounded-lg px-4 py-2.5 text-sm"
            autoComplete="current-password"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !regenPassword}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              {loading ? "Generating…" : "Generate new codes"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRegenOpen(false);
                setRegenPassword("");
              }}
              className="rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/70"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!enabled && stage === "idle" && (
        <button
          type="button"
          onClick={() => setStage("password")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Enable 2FA
        </button>
      )}

      {!enabled && stage === "password" && (
        <form onSubmit={handleStart} className="flex flex-col gap-3">
          <label
            htmlFor="twofa-start-pw"
            className="text-sm font-medium text-white/70"
          >
            Confirm with your password to begin
          </label>
          <input
            id="twofa-start-pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input rounded-lg px-4 py-2.5 text-sm"
            autoComplete="current-password"
            autoFocus
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !password}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              {loading ? "…" : "Continue"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("idle");
                setPassword("");
              }}
              className="rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/70"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!enabled && stage === "scan" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="mb-4 text-sm text-white/70">
              Scan this QR code with your authenticator app, then enter the
              6-digit code below.
            </p>
            <div className="flex flex-col items-center gap-3 md:flex-row md:items-start">
              <div
                className="rounded-lg bg-white p-3"
                role="img"
                aria-label="QR code for authenticator app setup. Scan or use the manual key below."
              >
                <QRCodeSVG value={totpUri} size={160} level="M" />
              </div>
              <div className="flex-1 text-xs">
                <p className="mb-2 font-medium text-white/60">
                  Can&apos;t scan?
                </p>
                <p className="mb-1 text-white/40">Enter this key manually:</p>
                <code className="break-all rounded bg-white/[0.06] p-2 font-mono text-xs text-white/80">
                  {new URL(totpUri).searchParams.get("secret")}
                </code>
              </div>
            </div>
          </div>

          <form onSubmit={handleVerify} className="flex flex-col gap-3">
            <label
              htmlFor="twofa-verify-code"
              className="text-sm font-medium text-white/70"
            >
              6-digit code from your app
            </label>
            <input
              id="twofa-verify-code"
              value={verifyCode}
              onChange={(e) =>
                setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="glass-input rounded-lg px-4 py-3 text-center text-xl font-mono tracking-[0.3em]"
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || verifyCode.length !== 6}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                {loading ? "Verifying…" : "Verify and continue"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage("idle");
                  setPassword("");
                  setVerifyCode("");
                  setTotpUri("");
                  setBackupCodes([]);
                }}
                className="rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/70"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {stage === "backup" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-accent-orange/30 bg-accent-orange/[0.05] p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent-orange">
              <ShieldAlert className="h-4 w-4" />
              Save these backup codes now
            </p>
            <p className="text-sm text-white/70">
              Use one if you lose access to your authenticator. Each code works
              once.{" "}
              <span className="font-semibold text-white">
                We can&apos;t show them again.
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 font-mono text-sm text-white/90">
            {backupCodes.map((code) => (
              <div key={code}>{code}</div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyCodes}
              className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.1]"
            >
              {copied ? (
                <Check className="h-4 w-4 text-accent-green" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy codes"}
            </button>
            <button
              onClick={downloadCodes}
              className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.1]"
            >
              <Download className="h-4 w-4" />
              Download .txt
            </button>
            <button
              onClick={handleFinish}
              className="ml-auto rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              I&apos;ve saved them
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
