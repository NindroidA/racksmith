"use client";

import { useId, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { X, TrashSimple, MagicWand } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Select, SelectOption } from "@/components/ui/select";
import {
  createIpAssignment,
  updateIpAssignment,
  deleteIpAssignment,
  suggestNextIp,
} from "@/app/(dashboard)/ipam/actions";
import { IP_ASSIGNMENT_STATUSES } from "@/lib/validators";
import type { AssignmentLite, DeviceLite } from "./subnet-types";

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
  const titleId = useId();
  const [ipAddress, setIpAddress] = useState(existing?.ipAddress ?? initialIp);
  const [status, setStatus] = useState<string>(existing?.status ?? "assigned");
  const [deviceId, setDeviceId] = useState<string>(existing?.device?.id ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
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

  return (
    <>
      <Dialog
        open={true}
        onClose={onClose}
        labelledBy={titleId}
        size="md"
        zIndex={65}
      >
        <header className="flex items-start justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <h2 id={titleId} className="font-semibold text-white">
              {existing ? "Edit IP assignment" : "Assign IP"}
            </h2>
            <p className="mt-0.5 mono text-xs text-white/50">{subnetCidr}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assignment dialog"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-white/40 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55"
          >
            <X className="h-4 w-4" weight="bold" aria-hidden />
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
                className="glass-input mono flex-1 rounded-lg px-4 py-2.5 text-sm"
                placeholder="192.168.1.10"
                required
                maxLength={45}
                autoComplete="off"
                data-1p-ignore
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={suggest}
                disabled={pending}
                title="Suggest next free IP"
                aria-label="Suggest next free IP"
                iconLeft={
                  <MagicWand
                    className="h-3.5 w-3.5"
                    weight="duotone"
                    aria-hidden
                  />
                }
              >
                Suggest
              </Button>
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
              <Select id="status" value={status} onValueChange={setStatus}>
                {IP_ASSIGNMENT_STATUSES.map((s) => (
                  <SelectOption key={s} value={s}>
                    {s}
                  </SelectOption>
                ))}
              </Select>
            </div>
            <div>
              <label
                htmlFor="device"
                className="mb-1.5 block text-sm font-medium text-white/70"
              >
                Device
              </label>
              <Select
                id="device"
                value={deviceId}
                onValueChange={setDeviceId}
                placeholder="(none)"
              >
                <SelectOption value="">(none)</SelectOption>
                {devices.map((d) => (
                  <SelectOption key={d.id} value={d.id}>
                    {d.name}
                  </SelectOption>
                ))}
              </Select>
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
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={pending}
              iconLeft={
                <TrashSimple
                  className="h-3.5 w-3.5"
                  weight="bold"
                  aria-hidden
                />
              }
            >
              Release
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="ip-assignment-form"
              disabled={pending || !ipAddress.trim()}
            >
              {pending ? "Saving..." : existing ? "Save" : "Assign"}
            </Button>
          </div>
        </footer>
      </Dialog>
      {existing && (
        <DeleteConfirmDialog
          open={confirmOpen}
          onClose={() => !pending && setConfirmOpen(false)}
          title="Release IP?"
          body={
            <p>
              Release{" "}
              <span className="mono text-white">{existing.ipAddress}</span>. The
              address becomes available for reassignment and any device link is
              removed.
            </p>
          }
          confirmLabel="Release IP"
          pending={pending}
          onConfirm={performRelease}
        />
      )}
    </>
  );
}
