"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import {
  confirmOwnershipTransfer,
  declineOwnershipTransfer,
} from "@/app/(dashboard)/settings/organization-actions";

export function OwnershipTransferForm({ transferId }: { transferId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  const accept = () => {
    startTransition(async () => {
      const result = await confirmOwnershipTransfer(transferId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDone("accepted");
      toast.success("You're now the owner");
      window.location.href = "/settings?tab=organization";
    });
  };

  const decline = () => {
    startTransition(async () => {
      const result = await declineOwnershipTransfer(transferId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDone("declined");
      toast.success("Transfer declined");
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
        <p className="text-sm text-white/60">Loading workspace…</p>
      )}
      {done === "declined" && (
        <p className="text-sm text-white/60">Transfer declined.</p>
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
            {pending ? "Working…" : "Confirm transfer"}
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
