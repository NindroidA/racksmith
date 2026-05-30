"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FloppyDisk,
  TrashSimple,
} from "@phosphor-icons/react/dist/ssr";
import { type ColorTag } from "@/types";
import { Button } from "@/components/ui/button";
import { ColorTagPicker } from "@/components/ui/color-tag-picker";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Select, SelectOption } from "@/components/ui/select";
import { useOrgAction } from "@/hooks/use-org-action";
import {
  createVlan,
  updateVlan,
  deleteVlan,
} from "@/app/(dashboard)/network-tools/vlans/actions";
import { VLAN_PURPOSES, type VlanInput } from "@/lib/validators";

type Purpose = (typeof VLAN_PURPOSES)[number];

type Props =
  | { mode: "create"; initial?: undefined; vlanRowId?: undefined }
  | { mode: "edit"; initial: VlanInput; vlanRowId: string };

const PURPOSE_LABELS: Record<Purpose, string> = {
  user: "User",
  management: "Management",
  iot: "IoT",
  guest: "Guest",
  voip: "VoIP",
  storage: "Storage",
  other: "Other",
};

export function VlanForm(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const run = useOrgAction(startTransition);
  const runDelete = useOrgAction(startDelete);

  const [vlanId, setVlanId] = useState<number>(props.initial?.vlanId ?? 10);
  const [name, setName] = useState(props.initial?.name ?? "");
  const [description, setDescription] = useState(
    props.initial?.description ?? "",
  );
  const [purpose, setPurpose] = useState<Purpose>(
    (props.initial?.purpose as Purpose) ?? "user",
  );
  const [colorTag, setColorTag] = useState<ColorTag>(
    (props.initial?.colorTag as ColorTag) ?? "purple",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: VlanInput = {
      vlanId,
      name: name.trim(),
      description: description.trim(),
      purpose,
      colorTag,
    };

    if (props.mode === "create") {
      run(() => createVlan(input), {
        okMessage: "VLAN created",
        noRefresh: true,
        onSuccess: (data) => router.push(`/network-tools/vlans/${data.id}`),
      });
    } else {
      run(() => updateVlan(props.vlanRowId, input), {
        okMessage: "VLAN updated",
        onSuccess: () => router.push(`/network-tools/vlans/${props.vlanRowId}`),
      });
    }
  }

  function performDelete() {
    if (props.mode !== "edit") return;
    runDelete(() => deleteVlan(props.vlanRowId), {
      okMessage: "VLAN deleted",
      noRefresh: true,
      onSuccess: () => router.push("/network-tools/vlans"),
      onError: () => setConfirmOpen(false),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="mx-auto max-w-2xl"
    >
      <Link
        href={
          props.mode === "edit"
            ? `/network-tools/vlans/${props.vlanRowId}`
            : "/network-tools/vlans"
        }
        className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" weight="bold" aria-hidden />
        Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {props.mode === "create" ? "New VLAN" : "Edit VLAN"}
        </h1>
        <p className="mt-1 text-white/60">
          Define a VLAN and link it to subnets + switch ports.
        </p>
      </div>

      <div className="surface-card space-y-6 p-6">
        <div className="grid grid-cols-[140px_1fr] gap-4">
          <div>
            <label
              htmlFor="vlanId"
              className="mb-1.5 block text-sm font-medium text-white/70"
            >
              VLAN ID <span className="text-accent-red">*</span>
            </label>
            <input
              id="vlanId"
              type="number"
              value={vlanId}
              onChange={(e) =>
                setVlanId(
                  Math.min(
                    4094,
                    Math.max(1, parseInt(e.target.value, 10) || 1),
                  ),
                )
              }
              className="glass-input w-full rounded-lg px-4 py-2.5 font-mono text-sm"
              min={1}
              max={4094}
              required
            />
            <p className="mt-1 text-xs text-white/40">
              <span className="mono">1–4094</span> (802.1Q)
            </p>
          </div>
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-white/70"
            >
              Name <span className="text-accent-red">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input w-full rounded-lg px-4 py-2.5 text-sm"
              placeholder="e.g. Mgmt, Users, IoT"
              required
              maxLength={40}
              autoComplete="off"
              data-1p-ignore
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="glass-input w-full resize-none rounded-lg px-4 py-2.5 text-sm"
            rows={2}
            placeholder="What kind of traffic flows on this VLAN?"
            maxLength={500}
          />
        </div>

        <div>
          <label
            htmlFor="purpose"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Purpose
          </label>
          <Select
            id="purpose"
            value={purpose}
            onValueChange={(v) => setPurpose(v as Purpose)}
          >
            {VLAN_PURPOSES.map((p) => (
              <SelectOption key={p} value={p}>
                {PURPOSE_LABELS[p]}
              </SelectOption>
            ))}
          </Select>
        </div>

        <ColorTagPicker label="Color" value={colorTag} onChange={setColorTag} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        {props.mode === "edit" ? (
          <Button
            variant="danger"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting || pending}
            iconLeft={
              <TrashSimple className="h-4 w-4" weight="bold" aria-hidden />
            }
          >
            {deleting ? "Deleting..." : "Delete VLAN"}
          </Button>
        ) : (
          <div />
        )}

        <div className="flex gap-3">
          <Link
            href={
              props.mode === "edit"
                ? `/network-tools/vlans/${props.vlanRowId}`
                : "/network-tools/vlans"
            }
            className="glass-button rounded-lg px-4 py-2.5 text-sm font-medium text-white"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={pending || deleting}
            iconLeft={
              <FloppyDisk className="h-4 w-4" weight="bold" aria-hidden />
            }
          >
            {pending
              ? "Saving..."
              : props.mode === "create"
                ? "Create VLAN"
                : "Save changes"}
          </Button>
        </div>
      </div>

      {props.mode === "edit" && (
        <DeleteConfirmDialog
          open={confirmOpen}
          onClose={() => !deleting && setConfirmOpen(false)}
          title="Delete VLAN?"
          body={
            <p>
              Removing this VLAN unassigns it from every device port that
              currently uses it. The VLAN itself is permanently deleted.
            </p>
          }
          confirmLabel="Delete VLAN"
          pending={deleting}
          onConfirm={performDelete}
        />
      )}
    </form>
  );
}
