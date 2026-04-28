"use client";

import { useMemo, useReducer, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { twMerge } from "tailwind-merge";
import { ArrowLeft, Save, Trash2, AlertTriangle } from "lucide-react";
import { type ColorTag } from "@/types";
import { ColorTagPicker } from "@/components/ui/color-tag-picker";
import { InlineHelp } from "@/components/ui/inline-help";
import { AdvancedAccordion } from "@/components/ui/advanced-accordion";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useOrgAction } from "@/hooks/use-org-action";
import {
  createSubnet,
  updateSubnet,
  deleteSubnet,
} from "@/app/(dashboard)/network-tools/ipam/actions";
import type { SubnetInput } from "@/lib/validators";
import { advise, type AdvisorWarning } from "@/lib/ip/advisor";

type FormState = {
  cidr: string;
  name: string;
  description: string;
  gateway: string;
  dnsServers: string;
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
  }
}

function buildInitial(initial?: SubnetInput): FormState {
  return {
    cidr: initial?.cidr ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    gateway: initial?.gateway ?? "",
    dnsServers: initial?.dnsServers ?? "",
    colorTag: (initial?.colorTag as ColorTag) ?? "blue",
  };
}

type Props =
  | {
      mode: "create";
      initial?: undefined;
      subnetId?: undefined;
      existingCidrs: string[];
    }
  | {
      mode: "edit";
      initial: SubnetInput;
      subnetId: string;
      existingCidrs: string[];
    };

export function SubnetForm(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const run = useOrgAction(startTransition);
  const runDelete = useOrgAction(startDelete);

  const [form, dispatch] = useReducer(formReducer, props.initial, buildInitial);
  const { cidr, name, description, gateway, dnsServers, colorTag } = form;
  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    dispatch({
      type: "set",
      payload: { [field]: value } as Partial<FormState>,
    });

  const warnings = useMemo<AdvisorWarning[]>(
    () => (cidr.trim() ? advise(cidr.trim(), props.existingCidrs) : []),
    [cidr, props.existingCidrs],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: SubnetInput = {
      cidr: cidr.trim(),
      name: name.trim(),
      description: description.trim(),
      gateway: gateway.trim() || null,
      dnsServers: dnsServers.trim(),
      colorTag,
    };

    if (props.mode === "create") {
      run(() => createSubnet(input), {
        okMessage: "Subnet created",
        noRefresh: true,
        onSuccess: (data) => router.push(`/network-tools/ipam/${data.id}`),
      });
    } else {
      run(() => updateSubnet(props.subnetId, input), {
        okMessage: "Subnet updated",
        onSuccess: () => router.push(`/network-tools/ipam/${props.subnetId}`),
      });
    }
  }

  function performDelete() {
    if (props.mode !== "edit") return;
    runDelete(() => deleteSubnet(props.subnetId), {
      okMessage: "Subnet deleted",
      noRefresh: true,
      onSuccess: () => router.push("/network-tools/ipam"),
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
            ? `/network-tools/ipam/${props.subnetId}`
            : "/network-tools/ipam"
        }
        className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {props.mode === "create" ? "New Subnet" : "Edit Subnet"}
        </h1>
        <p className="mt-1 text-white/60">
          Track a subnet and the IPs you assign inside it.
        </p>
      </div>

      <div className="glass-card space-y-6 rounded-xl p-6">
        <div>
          <InlineHelp htmlFor="cidr" term="CIDR" required>
            CIDR
          </InlineHelp>
          <input
            id="cidr"
            type="text"
            value={cidr}
            onChange={(e) => set("cidr", e.target.value)}
            className="glass-input w-full rounded-lg px-4 py-2.5 font-mono text-sm"
            placeholder="192.168.1.0/24"
            required
            maxLength={64}
            autoComplete="off"
            data-1p-ignore
          />
          {warnings.length > 0 && (
            <ul className="mt-2 space-y-1">
              {warnings.map((w) => (
                <li
                  key={w.id}
                  className={twMerge(
                    "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                    w.severity === "error"
                      ? "border-accent-red/30 bg-accent-red/10 text-accent-red"
                      : "border-accent-orange/30 bg-accent-orange/10 text-accent-orange",
                  )}
                >
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  />
                  <span>{w.message}</span>
                </li>
              ))}
            </ul>
          )}
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
            onChange={(e) => set("name", e.target.value)}
            className="glass-input w-full rounded-lg px-4 py-2.5 text-sm"
            placeholder="e.g. Main LAN, IoT VLAN"
            required
            maxLength={100}
            autoComplete="off"
            data-1p-ignore
          />
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
            onChange={(e) => set("description", e.target.value)}
            className="glass-input w-full resize-none rounded-lg px-4 py-2.5 text-sm"
            rows={2}
            placeholder="What's on this subnet?"
            maxLength={500}
          />
        </div>

        <AdvancedAccordion
          label="Routing details (optional)"
          defaultOpen={Boolean(
            props.initial?.gateway || props.initial?.dnsServers,
          )}
        >
          <div className="space-y-4">
            <div>
              <InlineHelp htmlFor="gateway" term="GATEWAY">
                Gateway
              </InlineHelp>
              <input
                id="gateway"
                type="text"
                value={gateway}
                onChange={(e) => set("gateway", e.target.value)}
                className="glass-input w-full rounded-lg px-4 py-2.5 font-mono text-sm"
                placeholder="192.168.1.1"
                maxLength={45}
                autoComplete="off"
                data-1p-ignore
              />
            </div>
            <div>
              <InlineHelp htmlFor="dnsServers" term="DNS">
                DNS servers
              </InlineHelp>
              <input
                id="dnsServers"
                type="text"
                value={dnsServers}
                onChange={(e) => set("dnsServers", e.target.value)}
                className="glass-input w-full rounded-lg px-4 py-2.5 font-mono text-sm"
                placeholder="1.1.1.1, 8.8.8.8"
                maxLength={400}
                autoComplete="off"
                data-1p-ignore
              />
              <p className="mt-1 text-xs text-white/40">
                Comma-separated list of DNS server IPs used by hosts on this
                subnet.
              </p>
            </div>
          </div>
        </AdvancedAccordion>

        <ColorTagPicker
          label="Color tag"
          value={colorTag}
          onChange={(value) => set("colorTag", value)}
        />
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
            {deleting ? "Deleting..." : "Delete subnet"}
          </button>
        ) : (
          <div />
        )}

        <div className="flex gap-3">
          <Link
            href={
              props.mode === "edit"
                ? `/network-tools/ipam/${props.subnetId}`
                : "/network-tools/ipam"
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
                ? "Create subnet"
                : "Save changes"}
          </button>
        </div>
      </div>

      {props.mode === "edit" && (
        <DeleteConfirmDialog
          open={confirmOpen}
          onClose={() => !deleting && setConfirmOpen(false)}
          title="Delete subnet?"
          body={
            <p>
              This permanently removes the subnet along with every IP assignment
              and DHCP range inside it. This action cannot be undone.
            </p>
          }
          confirmLabel="Delete subnet"
          pending={deleting}
          onConfirm={performDelete}
        />
      )}
    </form>
  );
}
