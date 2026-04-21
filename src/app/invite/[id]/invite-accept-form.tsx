"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import {
  acceptInvitationAction,
  declineInvitationAction,
} from "@/app/(dashboard)/settings/actions";

export function InviteAcceptForm({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  const accept = () => {
    startTransition(async () => {
      const result = await acceptInvitationAction(invitationId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDone("accepted");
      toast.success("You're in. Loading workspace...");
      // Force a full reload so the dashboard layout re-fetches the new
      // active org membership before rendering.
      window.location.href = "/dashboard";
    });
  };

  const decline = () => {
    startTransition(async () => {
      const result = await declineInvitationAction(invitationId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDone("declined");
      toast.success("Invitation declined");
      router.push("/dashboard");
    });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 flex flex-col gap-2 sm:flex-row"
    >
      {done === "accepted" && (
        <p className="text-sm text-white/60">Loading your workspace…</p>
      )}
      {done === "declined" && (
        <p className="text-sm text-white/60">Invitation declined.</p>
      )}
      {!done && (
        <>
          <button
            type="button"
            onClick={accept}
            disabled={pending}
            aria-busy={pending}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden />
            {pending ? "Working…" : "Accept invitation"}
          </button>
          <button
            type="button"
            onClick={decline}
            disabled={pending}
            aria-busy={pending}
            className="glass-button flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden />
            Decline
          </button>
        </>
      )}
    </div>
  );
}
