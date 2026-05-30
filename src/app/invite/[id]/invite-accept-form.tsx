"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X } from "@phosphor-icons/react/dist/ssr";
import {
  acceptInvitationAction,
  declineInvitationAction,
} from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";

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
          <Button
            variant="primary"
            onClick={accept}
            disabled={pending}
            aria-busy={pending}
            iconLeft={<Check weight="bold" className="h-4 w-4" aria-hidden />}
            className="flex-1"
          >
            {pending ? "Working…" : "Accept invitation"}
          </Button>
          <Button
            variant="secondary"
            onClick={decline}
            disabled={pending}
            aria-busy={pending}
            iconLeft={<X weight="bold" className="h-4 w-4" aria-hidden />}
          >
            Decline
          </Button>
        </>
      )}
    </div>
  );
}
