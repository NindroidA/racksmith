"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Check, X } from "@phosphor-icons/react/dist/ssr";
import {
  confirmOwnershipTransfer,
  declineOwnershipTransfer,
} from "@/app/(dashboard)/settings/organization-actions";
import { Button } from "@/components/ui/button";

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
          <Button
            variant="primary"
            onClick={accept}
            disabled={pending}
            aria-busy={pending}
            iconLeft={<Check weight="bold" className="h-4 w-4" aria-hidden />}
            className="flex-1"
          >
            {pending ? "Working…" : "Confirm transfer"}
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
