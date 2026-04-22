"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";
import { ArrowLeft, Save, Trash2, AlertTriangle } from "lucide-react";
import { COLOR_TAG_MAP, COLOR_TAGS, type ColorTag } from "@/types";
import { InlineHelp } from "@/components/ui/inline-help";
import { AdvancedAccordion } from "@/components/ui/advanced-accordion";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  createSubnet,
  updateSubnet,
  deleteSubnet,
} from "@/app/(dashboard)/network-tools/ipam/actions";
import type { SubnetInput } from "@/lib/validators";
import { advise, type AdvisorWarning } from "@/lib/ip/advisor";
import { describeError } from "@/lib/error-message";

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
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [cidr, setCidr] = useState(props.initial?.cidr ?? "");
  const [name, setName] = useState(props.initial?.name ?? "");
  const [description, setDescription] = useState(
    props.initial?.description ?? "",
  );
  const [gateway, setGateway] = useState(props.initial?.gateway ?? "");
  const [dnsServers, setDnsServers] = useState(props.initial?.dnsServers ?? "");
  const [colorTag, setColorTag] = useState<ColorTag>(
    (props.initial?.colorTag as ColorTag) ?? "blue",
  );

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

    startTransition(async () => {
      try {
        if (props.mode === "create") {
          const result = await createSubnet(input);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Subnet created");
          router.push(`/network-tools/ipam/${result.data.id}`);
        } else {
          const result = await updateSubnet(props.subnetId, input);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Subnet updated");
          router.push(`/network-tools/ipam/${props.subnetId}`);
          router.refresh();
        }
      } catch (err) {
        toast.error(
          describeError(err, "Something went wrong"),
        );
      }
    });
  }

  async function performDelete() {
    if (props.mode !== "edit") return;
    setDeleting(true);
    try {
      const result = await deleteSubnet(props.subnetId);
      if (!result.ok) {
        toast.error(result.error);
        setDeleting(false);
        setConfirmOpen(false);
        return;
      }
      toast.success("Subnet deleted");
      router.push("/network-tools/ipam");
    } catch (err) {
      toast.error(describeError(err, "Failed to delete"));
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
            onChange={(e) => setCidr(e.target.value)}
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
            onChange={(e) => setName(e.target.value)}
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
            onChange={(e) => setDescription(e.target.value)}
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
                onChange={(e) => setGateway(e.target.value)}
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
                onChange={(e) => setDnsServers(e.target.value)}
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

        <div>
          <label className="mb-2 block text-sm font-medium text-white/70">
            Color tag
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
