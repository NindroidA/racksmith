"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { X, Trash2, Wand2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  createIpAssignment,
  updateIpAssignment,
  deleteIpAssignment,
  suggestNextIp,
} from "@/app/(dashboard)/network-tools/ipam/actions";
import { IP_ASSIGNMENT_STATUSES } from "@/lib/validators";
import type { AssignmentLite, DeviceLite } from "./subnet-types";
import { describeError } from "@/lib/error-message";

type Props = {
  subnetId: string;
  subnetCidr: string;
  devices: DeviceLite[];
  initialIp: string;
  existing: AssignmentLite | null;
  onClose: () => void;
};

export function IpAssignmentDialog({
  subnetId,
  subnetCidr,
  devices,
  initialIp,
  existing,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(true, dialogRef);

  const [ipAddress, setIpAddress] = useState(existing?.ipAddress ?? initialIp);
  const [status, setStatus] = useState<string>(existing?.status ?? "assigned");
  const [deviceId, setDeviceId] = useState<string>(existing?.device?.id ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          subnetId,
          ipAddress: ipAddress.trim(),
          deviceId: deviceId || null,
          status: status as (typeof IP_ASSIGNMENT_STATUSES)[number],
          notes: notes.trim(),
        };
        const result = existing
          ? await updateIpAssignment(existing.id, payload)
          : await createIpAssignment(payload);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(existing ? "Assignment updated" : "IP assigned");
        onClose();
      } catch (err) {
        toast.error(describeError(err, "Failed"));
      }
    });
  };

  const performRelease = () => {
    if (!existing) return;
    startTransition(async () => {
      const result = await deleteIpAssignment(existing.id);
      if (!result.ok) {
        toast.error(result.error);
        setConfirmOpen(false);
        return;
      }
      toast.success("Released");
      setConfirmOpen(false);
      onClose();
    });
  };

  const suggest = () => {
    startTransition(async () => {
      const result = await suggestNextIp(subnetId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (!result.data.ip) {
        toast.error("No free IP available in this subnet");
        return;
      }
      setIpAddress(result.data.ip);
    });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      >
        <motion.div
          ref={dialogRef}
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="assignment-title"
          className="glass-panel w-full max-w-md overflow-hidden rounded-2xl"
        >
          <header className="flex items-start justify-between border-b border-white/[0.08] px-5 py-4">
            <div>
              <h2 id="assignment-title" className="font-semibold text-white">
                {existing ? "Edit IP assignment" : "Assign IP"}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-white/50">
                {subnetCidr}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close assignment dialog"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-white/40 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <form
            id="ip-assignment-form"
            onSubmit={submit}
            className="space-y-4 px-5 py-4"
          >
            <div>
              <label
                htmlFor="ip"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                IP address
              </label>
              <div className="flex gap-2">
                <input
                  id="ip"
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="glass-input flex-1 rounded-lg px-4 py-2.5 font-mono text-sm"
                  placeholder="192.168.1.10"
                  required
                  maxLength={45}
                  autoComplete="off"
                  data-1p-ignore
                />
                <button
                  type="button"
                  onClick={suggest}
                  disabled={pending}
                  title="Suggest next free IP"
                  aria-label="Suggest next free IP"
                  className="glass-button flex items-center gap-1 rounded-lg px-3 text-xs font-medium text-white"
                >
                  <Wand2 className="h-3.5 w-3.5" aria-hidden />
                  Suggest
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="status"
                  className="mb-1.5 block text-sm font-medium text-white/70"
                >
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="glass-input w-full rounded-lg px-3 py-2.5 text-sm"
                >
                  {IP_ASSIGNMENT_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-neutral-900">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="device"
                  className="mb-1.5 block text-sm font-medium text-white/70"
                >
                  Device
                </label>
                <select
                  id="device"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="glass-input w-full rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="" className="bg-neutral-900">
                    (none)
                  </option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id} className="bg-neutral-900">
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="glass-input w-full resize-none rounded-lg px-4 py-2.5 text-sm"
                rows={2}
                maxLength={500}
                placeholder="Reason for reservation, ticket #, etc."
              />
            </div>
          </form>

          <footer className="flex items-center justify-between border-t border-white/[0.08] px-5 py-3">
            {existing ? (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={pending}
                className="flex items-center gap-1 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-1.5 text-xs font-medium text-accent-red hover:bg-accent-red/20 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Release
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="glass-button rounded-lg px-4 py-1.5 text-xs font-medium text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="ip-assignment-form"
                disabled={pending || !ipAddress.trim()}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 disabled:opacity-50"
              >
                {pending ? "Saving..." : existing ? "Save" : "Assign"}
              </button>
            </div>
          </footer>
        </motion.div>
      </motion.div>
      {existing && (
        <DeleteConfirmDialog
          open={confirmOpen}
          onClose={() => !pending && setConfirmOpen(false)}
          title="Release IP?"
          body={
            <p>
              Release{" "}
              <span className="font-mono text-white">{existing.ipAddress}</span>
              . The address becomes available for reassignment and any device
              link is removed.
            </p>
          }
          confirmLabel="Release IP"
          pending={pending}
          onConfirm={performRelease}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}
