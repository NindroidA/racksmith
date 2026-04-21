"use client";

import { useMemo, useState } from "react";
import { SubnetGrid } from "./subnet-grid";
import { IpAssignmentDialog } from "./ip-assignment-dialog";
import { DhcpRangeSection } from "./dhcp-range-section";
import { AssignmentList } from "./assignment-list";
import type {
  AssignmentLite,
  DeviceLite,
  DhcpRangeLite,
  SubnetDetails,
  SubnetLite,
} from "./subnet-types";

type EditTarget = { ip: string; assignment: AssignmentLite | null };

type Props = {
  subnet: SubnetLite;
  details: SubnetDetails;
  assignments: AssignmentLite[];
  dhcpRanges: DhcpRangeLite[];
  devices: DeviceLite[];
};

export function SubnetDetailClient({
  subnet,
  details,
  assignments,
  dhcpRanges,
  devices,
}: Props) {
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const byIp = useMemo(
    () => new Map(assignments.map((a) => [a.ipAddress, a])),
    [assignments],
  );

  const openAssign = (ip: string) => {
    const existing = byIp.get(ip) ?? null;
    setEditTarget({ ip, assignment: existing });
  };

  const openNew = () => setEditTarget({ ip: "", assignment: null });

  const utilization = useMemo(() => {
    const usable = Number(details.usableHosts);
    if (!Number.isFinite(usable) || usable === 0) return 0;
    return Math.min(100, (assignments.length / usable) * 100);
  }, [details.usableHosts, assignments.length]);

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Overview</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Type" value={details.kind.toUpperCase()} />
          <Stat label="Prefix" value={`/${details.prefix}`} />
          <Stat label="Network" value={details.network} mono />
          {details.broadcast && (
            <Stat label="Broadcast" value={details.broadcast} mono />
          )}
          {details.firstUsable && (
            <Stat label="First usable" value={details.firstUsable} mono />
          )}
          {details.lastUsable && (
            <Stat label="Last usable" value={details.lastUsable} mono />
          )}
          {subnet.gateway && (
            <Stat label="Gateway" value={subnet.gateway} mono />
          )}
          {subnet.dnsServers && (
            <Stat label="DNS" value={subnet.dnsServers} mono />
          )}
          <Stat
            label="Utilization"
            value={`${Math.round(utilization)}% (${assignments.length} assigned)`}
          />
        </dl>
      </section>

      <SubnetGrid
        subnetCidr={subnet.cidr}
        assignments={assignments}
        dhcpRanges={dhcpRanges}
        onCellClick={openAssign}
      />

      <DhcpRangeSection
        subnetId={subnet.id}
        subnetCidr={subnet.cidr}
        dhcpRanges={dhcpRanges}
      />

      <AssignmentList
        assignments={assignments}
        onEdit={(a) => setEditTarget({ ip: a.ipAddress, assignment: a })}
        onAdd={openNew}
      />

      {editTarget && (
        <IpAssignmentDialog
          subnetId={subnet.id}
          subnetCidr={subnet.cidr}
          devices={devices}
          initialIp={editTarget.ip}
          existing={editTarget.assignment}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-white/40">
        {label}
      </dt>
      <dd className={`mt-0.5 text-sm text-white ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
