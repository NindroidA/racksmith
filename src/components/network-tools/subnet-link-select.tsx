"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Unlink } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Select, SelectOption } from "@/components/ui/select";
import { linkSubnetToVlan } from "@/app/(dashboard)/network-tools/vlans/actions";

type ConfirmTarget = { subnetId: string; cidr: string } | null;

type SubnetRow = {
  id: string;
  cidr: string;
  name: string;
  vlanId: string | null;
};

type Props = {
  vlanRowId: string;
  allSubnets: SubnetRow[];
  linkedSubnetIds: string[];
};

export function SubnetLinkSelect({
  vlanRowId,
  allSubnets,
  linkedSubnetIds,
}: Props) {
  const [selectId, setSelectId] = useState("");
  const [pending, startTransition] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);

  const linked = allSubnets.filter((s) => linkedSubnetIds.includes(s.id));
  const available = allSubnets.filter(
    (s) => !linkedSubnetIds.includes(s.id) && s.vlanId === null,
  );

  const link = (subnetId: string) => {
    startTransition(async () => {
      const result = await linkSubnetToVlan(subnetId, vlanRowId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Subnet linked");
      setSelectId("");
    });
  };

  const performUnlink = () => {
    if (!confirmTarget) return;
    const subnetId = confirmTarget.subnetId;
    startTransition(async () => {
      const result = await linkSubnetToVlan(subnetId, null);
      if (!result.ok) {
        toast.error(result.error);
        setConfirmTarget(null);
        return;
      }
      toast.success("Subnet unlinked");
      setConfirmTarget(null);
    });
  };

  return (
    <section className="glass-card rounded-xl p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Linked subnets</h2>
        {available.length > 0 && (
          <div className="flex items-center gap-2">
            <Select
              value={selectId}
              onValueChange={setSelectId}
              disabled={pending}
              placeholder="Pick a subnet to link…"
              className="px-3 py-1.5 text-xs"
            >
              {available.map((s) => (
                <SelectOption key={s.id} value={s.id}>
                  {s.cidr} ({s.name})
                </SelectOption>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => selectId && link(selectId)}
              disabled={!selectId || pending}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-3 w-3" aria-hidden />
              Link
            </button>
          </div>
        )}
      </div>

      {linked.length === 0 ? (
        <p className="text-sm text-white/50">
          No subnets linked. Link one from IPAM to tie this VLAN to an IP range.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {linked.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <Link
                href={`/network-tools/ipam/${s.id}`}
                className="font-mono text-white hover:text-primary"
              >
                {s.cidr}
                <span className="ml-2 text-white/60">{s.name}</span>
              </Link>
              <button
                type="button"
                onClick={() =>
                  setConfirmTarget({ subnetId: s.id, cidr: s.cidr })
                }
                aria-label={`Unlink ${s.cidr}`}
                className="flex items-center gap-1 text-xs text-white/40 hover:text-accent-red"
              >
                <Unlink className="h-3 w-3" aria-hidden />
                Unlink
              </button>
            </li>
          ))}
        </ul>
      )}

      <DeleteConfirmDialog
        open={confirmTarget !== null}
        onClose={() => !pending && setConfirmTarget(null)}
        title="Unlink subnet?"
        body={
          <p>
            Unlink{" "}
            <span className="font-mono text-white">{confirmTarget?.cidr}</span>{" "}
            from this VLAN? The subnet and its IP assignments stay intact — only
            the VLAN association is removed.
          </p>
        }
        confirmLabel="Unlink subnet"
        pending={pending}
        onConfirm={performUnlink}
      />
    </section>
  );
}
