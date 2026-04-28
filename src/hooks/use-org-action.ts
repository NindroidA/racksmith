"use client";

import { useRouter } from "next/navigation";
import type { TransitionStartFunction } from "react";
import toast from "react-hot-toast";
import type { ActionResult } from "@/lib/action-types";

type RunOptions<T> = {
  okMessage?: string;
  /**
   * Called on the happy path before `router.refresh()`. Receives the
   * action's `data` payload — handy for create-then-navigate flows that
   * need the new row's id (`onSuccess: (data) => router.push(`/x/${data.id}`)`).
   * Existing zero-arg callbacks remain compatible: TypeScript allows a
   * callback that accepts fewer parameters where one accepting more is
   * expected, since extra arguments are simply ignored at the call.
   */
  onSuccess?: (data: T) => void;
  onError?: () => void;
  onSettled?: () => void;
  noRefresh?: boolean;
};

export type ActionRunner = <T>(
  action: () => Promise<ActionResult<T>>,
  opts?: RunOptions<T>,
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
  return <T>(
    action: () => Promise<ActionResult<T>>,
    opts: RunOptions<T> = {},
  ) => {
    start(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          toast.error(result.error);
          opts.onError?.();
          return;
        }
        if (opts.okMessage) toast.success(opts.okMessage);
        opts.onSuccess?.(result.data);
        if (!opts.noRefresh) router.refresh();
      } catch {
        // Server actions normally return ActionResult, but a network failure
        // or unhandled throw inside `withActionEnvelope` can still surface
        // here as a rejection. Treat it as a generic failure so callers don't
        // get an unhandled rejection and `onSettled` always runs.
        toast.error("Something went wrong. Please try again.");
        opts.onError?.();
      } finally {
        opts.onSettled?.();
      }
    });
  };
}
