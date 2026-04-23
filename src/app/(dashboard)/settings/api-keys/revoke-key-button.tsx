"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { revokeApiKey } from "./actions";
import { describeError } from "@/lib/error-message";

export function RevokeKeyButton({
  keyId,
  keyName,
}: {
  keyId: string;
  keyName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const onConfirm = () => {
    start(async () => {
      try {
        const res = await revokeApiKey(keyId);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Key revoked");
        setOpen(false);
      } catch (err) {
        toast.error(describeError(err, "Failed to revoke"));
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-accent-red/30 bg-accent-red/10 px-2.5 py-1.5 text-xs font-medium text-accent-red hover:bg-accent-red/20"
      >
        Revoke
      </button>
      <DeleteConfirmDialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Revoke API key?"
        body={
          <p>
            Any scripts using <strong>{keyName}</strong> will stop working
            immediately. This cannot be undone.
          </p>
        }
        confirmLabel="Revoke key"
        requireTypeName={keyName}
        pending={pending}
        onConfirm={onConfirm}
      />
    </>
  );
}
