"use client";

import { useRouter } from "next/navigation";
import type { TransitionStartFunction } from "react";
import toast from "react-hot-toast";
import type { ActionResult } from "@/lib/action-types";

type RunOptions = {
  okMessage?: string;
  onSuccess?: () => void;
  onError?: () => void;
  onSettled?: () => void;
  noRefresh?: boolean;
};

export type ActionRunner = <T>(
  action: () => Promise<ActionResult<T>>,
  opts?: RunOptions,
) => void;

/**
 * Wraps the `startTransition + await action + toast + refresh` shape that every
 * server-action call site in `organization-section.tsx` (and anywhere else with
 * the same pattern) repeats. Pass the `startTransition` from `useTransition()`;
 * receive a runner that handles the universal happy/sad path.
 *
 * `onSettled` fires in both paths (clear `pendingId` etc). `onSuccess` /
 * `onError` are branch-specific. `noRefresh: true` skips `router.refresh()` —
 * use it for actions that navigate (window.location.href) or don't change
 * tenant-visible state (resend invite).
 */
export function useOrgAction(start: TransitionStartFunction): ActionRunner {
  const router = useRouter();
  return <T,>(action: () => Promise<ActionResult<T>>, opts: RunOptions = {}) => {
    start(async () => {
      const result = await action();
      opts.onSettled?.();
      if (!result.ok) {
        toast.error(result.error);
        opts.onError?.();
        return;
      }
      if (opts.okMessage) toast.success(opts.okMessage);
      opts.onSuccess?.();
      if (!opts.noRefresh) router.refresh();
    });
  };
}
