"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Select, SelectOption } from "@/components/ui/select";

type Props = {
  actionFilter: string;
  entityFilter: string;
  actionLabels: Record<string, string>;
};

/**
 * Client-side wrapper for the audit-log filter form. Uses the custom
 * <Select> primitive + `name` hidden inputs so the native GET form still
 * captures the current values on submit.
 */
export function AuditFilters({
  actionFilter,
  entityFilter,
  actionLabels,
}: Props) {
  const [action, setAction] = useState(actionFilter);
  const [entity, setEntity] = useState(entityFilter);

  // Clear link uses client-side navigation, so this component stays mounted
  // while the URL search params change. Sync local state from props whenever
  // the incoming filters shift so the Select triggers reflect the URL.
  useEffect(() => setAction(actionFilter), [actionFilter]);
  useEffect(() => setEntity(entityFilter), [entityFilter]);

  return (
    <form method="get" className="surface-card mb-4 flex flex-wrap gap-3 p-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="audit-filter-action"
          className="text-xs font-medium uppercase tracking-wider text-white/40"
        >
          Action
        </label>
        <Select
          id="audit-filter-action"
          name="action"
          value={action}
          onValueChange={setAction}
          placeholder="All actions"
        >
          <SelectOption value="">All actions</SelectOption>
          {Object.entries(actionLabels).map(([v, label]) => (
            <SelectOption key={v} value={v}>
              {label}
            </SelectOption>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="audit-filter-entity"
          className="text-xs font-medium uppercase tracking-wider text-white/40"
        >
          Entity
        </label>
        <Select
          id="audit-filter-entity"
          name="entity"
          value={entity}
          onValueChange={setEntity}
          placeholder="All entities"
        >
          <SelectOption value="">All entities</SelectOption>
          <SelectOption value="rack">Rack</SelectOption>
          <SelectOption value="device">Device</SelectOption>
          <SelectOption value="connection">Connection</SelectOption>
          <SelectOption value="discovery_scan">Discovery scan</SelectOption>
          <SelectOption value="user">Account</SelectOption>
        </Select>
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Apply
        </button>
      </div>
      {(actionFilter || entityFilter) && (
        <div className="flex items-end">
          <Link
            href="/settings/audit"
            className="rounded-lg bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.1]"
          >
            Clear
          </Link>
        </div>
      )}
    </form>
  );
}
