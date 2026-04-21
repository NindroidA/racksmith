"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { COLOR_TAG_MAP, COLOR_TAGS, type ColorTag } from "@/types";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
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
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

    startTransition(async () => {
      try {
        if (props.mode === "create") {
          const result = await createVlan(input);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("VLAN created");
          router.push(`/network-tools/vlans/${result.data.id}`);
        } else {
          const result = await updateVlan(props.vlanRowId, input);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("VLAN updated");
          router.push(`/network-tools/vlans/${props.vlanRowId}`);
          router.refresh();
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Something went wrong",
        );
      }
    });
  }

  async function performDelete() {
    if (props.mode !== "edit") return;
    setDeleting(true);
    try {
      const result = await deleteVlan(props.vlanRowId);
      if (!result.ok) {
        toast.error(result.error);
        setDeleting(false);
        setConfirmOpen(false);
        return;
      }
      toast.success("VLAN deleted");
      router.push("/network-tools/vlans");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
      setConfirmOpen(false);
    }
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
        <ArrowLeft className="h-4 w-4" aria-hidden />
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

      <div className="glass-card space-y-6 rounded-xl p-6">
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
            <p className="mt-1 text-xs text-white/40">1–4094 (802.1Q)</p>
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
          <select
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as Purpose)}
            className="glass-input w-full rounded-lg px-3 py-2.5 text-sm"
          >
            {VLAN_PURPOSES.map((p) => (
              <option key={p} value={p} className="bg-neutral-900">
                {PURPOSE_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white/70">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setColorTag(tag)}
                className={twMerge(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium capitalize transition-all",
                  colorTag === tag
                    ? "bg-white/[0.08] ring-2 ring-white/20"
                    : "bg-white/[0.03] hover:bg-white/[0.06]",
                )}
              >
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: COLOR_TAG_MAP[tag] }}
                />
                <span className="text-white/80">{tag}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        {props.mode === "edit" ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting || pending}
            className="flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-2.5 text-sm font-medium text-accent-red transition-all hover:bg-accent-red/20 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {deleting ? "Deleting..." : "Delete VLAN"}
          </button>
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
          <button
            type="submit"
            disabled={pending || deleting}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden />
            {pending
              ? "Saving..."
              : props.mode === "create"
                ? "Create VLAN"
                : "Save changes"}
          </button>
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
