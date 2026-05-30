"use client";

import { useReducer, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { twMerge } from "tailwind-merge";
import {
  ArrowLeft,
  FloppyDisk,
  TrashSimple,
} from "@phosphor-icons/react/dist/ssr";
import type { ColorTag } from "@/types";
import { ColorTagPicker } from "@/components/ui/color-tag-picker";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useOrgAction } from "@/hooks/use-org-action";
import {
  createRack,
  updateRack,
  deleteRack,
} from "@/app/(dashboard)/racks/actions";
import type { RackInput } from "@/lib/validators";

type FormState = {
  name: string;
  sizeU: number;
  location: string;
  description: string;
  colorTag: ColorTag;
};

type FormAction =
  | { type: "set"; payload: Partial<FormState> }
  | { type: "reset"; state: FormState };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "set":
      return { ...state, ...action.payload };
    case "reset":
      return action.state;
    default:
      // Discriminated-union exhaustiveness is enforced at compile time;
      // the default belt is for runtime safety if a caller bypasses the
      // type system (e.g. via `any` or untyped JS).
      return state;
  }
}

function buildInitial(initial?: RackInput): FormState {
  return {
    name: initial?.name ?? "",
    sizeU: initial?.sizeU ?? 42,
    location: initial?.location ?? "",
    description: initial?.description ?? "",
    colorTag: (initial?.colorTag as ColorTag) ?? "blue",
  };
}

type Props =
  | { mode: "create"; initial?: undefined; rackId?: undefined }
  | { mode: "edit"; initial: RackInput; rackId: string };

const SIZE_PRESETS = [4, 6, 9, 12, 15, 18, 22, 24, 27, 32, 36, 42, 47];

export function RackForm(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const run = useOrgAction(startTransition);
  const runDelete = useOrgAction(startDelete);

  const [form, dispatch] = useReducer(formReducer, props.initial, buildInitial);
  const { name, sizeU, location, description, colorTag } = form;
  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    dispatch({
      type: "set",
      payload: { [field]: value } as Partial<FormState>,
    });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: RackInput = {
      name: name.trim(),
      sizeU,
      location: location.trim(),
      description: description.trim(),
      colorTag,
    };

    if (props.mode === "create") {
      run(() => createRack(input), {
        okMessage: "Rack created",
        // Navigation triggers a fresh server-component render — no extra
        // refresh needed.
        noRefresh: true,
        onSuccess: (data) => router.push(`/racks/${data.id}`),
      });
    } else {
      run(() => updateRack(props.rackId, input), {
        okMessage: "Rack updated",
        onSuccess: () => router.push(`/racks/${props.rackId}`),
      });
    }
  }

  function performDelete() {
    if (props.mode !== "edit") return;
    runDelete(() => deleteRack(props.rackId), {
      okMessage: "Rack deleted",
      noRefresh: true,
      onSuccess: () => router.push("/racks"),
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
        href={props.mode === "edit" ? `/racks/${props.rackId}` : "/racks"}
        className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" weight="bold" />
        Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {props.mode === "create" ? "New Rack" : "Edit Rack"}
        </h1>
        <p className="mt-1 text-white/60">
          {props.mode === "create"
            ? "Configure a new rack for your infrastructure"
            : "Update rack configuration"}
        </p>
      </div>

      <div className="surface-card space-y-6 p-6">
        {/* Name */}
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
            onChange={(e) => set("name", e.target.value)}
            className="glass-input w-full rounded-lg px-4 py-2.5 text-sm"
            placeholder="e.g. Main Rack, Closet A, Core Network"
            required
            maxLength={100}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>

        {/* Size U */}
        <div>
          <label
            htmlFor="sizeU"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Size (U) <span className="text-accent-red">*</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              id="sizeU"
              type="number"
              value={sizeU}
              onChange={(e) =>
                set("sizeU", Math.max(1, parseInt(e.target.value) || 1))
              }
              className="glass-input w-24 rounded-lg px-4 py-2.5 text-sm"
              min={1}
              max={60}
              required
            />
            <div className="flex flex-wrap gap-1.5">
              {SIZE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => set("sizeU", preset)}
                  className={twMerge(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                    sizeU === preset
                      ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                      : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80",
                  )}
                >
                  {preset}U
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-white/40">
            How many rack units tall is this rack?
          </p>
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="location"
            className="mb-1.5 block text-sm font-medium text-white/70"
          >
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => set("location", e.target.value)}
            className="glass-input w-full rounded-lg px-4 py-2.5 text-sm"
            placeholder="e.g. Basement, MDF, Suite 300"
            maxLength={200}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>

        {/* Description */}
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
            onChange={(e) => set("description", e.target.value)}
            className="glass-input w-full resize-none rounded-lg px-4 py-2.5 text-sm"
            rows={3}
            placeholder="Optional notes about this rack"
            maxLength={500}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>

        <ColorTagPicker
          label="Color Tag"
          value={colorTag}
          onChange={(value) => set("colorTag", value)}
        />
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between">
        {props.mode === "edit" ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting || pending}
            className="flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-2.5 text-sm font-medium text-accent-red transition-all hover:bg-accent-red/20 disabled:opacity-50"
          >
            <TrashSimple className="h-4 w-4" weight="bold" />
            {deleting ? "Deleting..." : "Delete Rack"}
          </button>
        ) : (
          <div />
        )}

        <div className="flex gap-3">
          <Link
            href={props.mode === "edit" ? `/racks/${props.rackId}` : "/racks"}
            className="glass-button rounded-lg px-4 py-2.5 text-sm font-medium text-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending || deleting}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            <FloppyDisk className="h-4 w-4" weight="bold" />
            {pending
              ? "Saving..."
              : props.mode === "create"
                ? "Create Rack"
                : "Save Changes"}
          </button>
        </div>
      </div>

      {props.mode === "edit" && (
        <DeleteConfirmDialog
          open={confirmOpen}
          onClose={() => !deleting && setConfirmOpen(false)}
          title="Delete rack?"
          body={
            <p>
              Devices currently inside this rack become unracked (they are not
              deleted). The rack itself is permanently removed and this action
              cannot be undone.
            </p>
          }
          confirmLabel="Delete rack"
          pending={deleting}
          onConfirm={performDelete}
        />
      )}
    </form>
  );
}
