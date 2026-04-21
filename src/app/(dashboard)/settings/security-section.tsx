"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Monitor, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";

type SessionRow = {
  id: string;
  token: string;
  createdAt: string | Date;
  expiresAt: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  current: boolean;
};

function formatUserAgent(ua?: string | null) {
  if (!ua) return "Unknown device";
  if (/iPhone|iPad/.test(ua)) return "iOS device";
  if (/Android/.test(ua)) return "Android device";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown device";
}

function formatBrowser(ua?: string | null) {
  if (!ua) return "";
  if (/Firefox/.test(ua)) return "Firefox";
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) return "Chrome";
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "Safari";
  return "";
}

export function SecuritySection({ currentSessionId }: { currentSessionId: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const result = await authClient.listSessions();
      const data = (result.data ?? []) as Array<Omit<SessionRow, "current">>;
      const rows: SessionRow[] = data.map((s) => ({
        ...s,
        current: s.id === currentSessionId,
      }));
      rows.sort((a, b) => (a.current ? -1 : b.current ? 1 : 0));
      setSessions(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords don't match");
      return;
    }

    setPwLoading(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to change password");
      } else {
        toast.success("Password changed. Other sessions were signed out.");
        setCurrent("");
        setNext("");
        setConfirm("");
        loadSessions();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleRevoke(token: string) {
    setRevokeLoading(token);
    try {
      const result = await authClient.revokeSession({ token });
      if (result.error) {
        toast.error(result.error.message || "Failed to revoke");
      } else {
        toast.success("Session signed out");
        setSessions((prev) => prev.filter((s) => s.token !== token));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setRevokeLoading(null);
    }
  }

  async function handleRevokeOthers() {
    try {
      const result = await authClient.revokeOtherSessions();
      if (result.error) {
        toast.error(result.error.message || "Failed");
      } else {
        toast.success("All other sessions signed out");
        loadSessions();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleSignOutAll() {
    try {
      await authClient.revokeSessions();
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <section className="glass-card rounded-xl p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
        <Lock className="h-4 w-4 text-primary" />
        Security
      </h2>
      <p className="mb-6 text-sm text-white/50">
        Change your password and manage active sessions.
      </p>

      <form
        onSubmit={handleChangePassword}
        className="mb-8 flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/70">
            Current password
          </label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="glass-input rounded-lg px-4 py-2.5 text-sm"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">
              New password
            </label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="glass-input rounded-lg px-4 py-2.5 text-sm"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/70">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="glass-input rounded-lg px-4 py-2.5 text-sm"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pwLoading}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {pwLoading ? "Changing…" : "Change password"}
          </button>
          <p className="text-xs text-white/40">
            Other sessions will be signed out.
          </p>
        </div>
      </form>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">
            Active sessions
          </h3>
          {sessions.length > 1 && (
            <button
              onClick={handleRevokeOthers}
              className="text-xs text-white/50 transition-colors hover:text-white"
            >
              Sign out all other sessions
            </button>
          )}
        </div>

        {sessionsLoading ? (
          <div className="h-16 animate-pulse rounded-lg bg-white/[0.04]" />
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <Monitor className="h-4 w-4 shrink-0 text-white/40" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {formatUserAgent(s.userAgent)}
                    </span>
                    {formatBrowser(s.userAgent) && (
                      <span className="text-xs text-white/40">
                        · {formatBrowser(s.userAgent)}
                      </span>
                    )}
                    {s.current && (
                      <span className="rounded-full bg-accent-green/15 px-2 py-0.5 text-xs text-accent-green">
                        This device
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/40">
                    {s.ipAddress ?? "Unknown IP"} · Signed in{" "}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {!s.current && (
                  <button
                    onClick={() => handleRevoke(s.token)}
                    disabled={revokeLoading === s.token}
                    className="text-xs text-white/50 transition-colors hover:text-accent-red disabled:opacity-40"
                  >
                    {revokeLoading === s.token ? "…" : "Sign out"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 border-t border-white/[0.06] pt-4">
        <button
          onClick={handleSignOutAll}
          className="flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-accent-red"
        >
          <LogOut className="h-4 w-4" />
          Sign out everywhere (including this device)
        </button>
      </div>
    </section>
  );
}
