import type { ActionResult } from "./action-types";
import { ForbiddenError } from "./auth-helpers";
import { describeError } from "./error-message";
import type { LimitCheckDenied } from "./tiers";

// Re-exported so server-side callers that already imported from this module
// keep working without churn. Client callers should import from
// `@/lib/error-message` directly to avoid pulling server-only deps.
export { describeError };

export function handleZodError(err: unknown): string {
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: Array<{ message: string }> }).issues;
    return issues[0]?.message || "Invalid input";
  }
  return describeError(err, "Unknown error");
}

/**
 * Standard tier-denial response shape. Replaces the 11-line transform that
 * was repeated across 8 server-action call sites pre-R3.
 */
export function tierDenial(check: LimitCheckDenied): ActionResult<never> {
  return {
    ok: false,
    error: check.reason,
    limit: {
      resource: check.resource,
      plan: check.plan,
      current: check.current,
      max: check.limit,
    },
  };
}

/**
 * Wrap a server-action body so both `ForbiddenError` (from requireMember)
 * and unexpected thrown errors (Prisma failures, network issues) collapse
 * into an `ActionResult` instead of bubbling to Next's 500 boundary. The
 * action body itself is responsible for returning `ActionResult<T>` —
 * early returns for validation, not-found, tier-denied, etc. stay inside
 * the callback and flow through unchanged.
 *
 * Replaces ~43 hand-rolled try/catch envelopes across 10+ action files
 * (see `action_envelope_boilerplate` review finding). Keep the body
 * short: any non-throwing error path should `return { ok: false, error }`
 * directly; the envelope only catches truly unexpected throws.
 *
 * @param fn — produces the action's typed ActionResult<T>.
 * @param fallback — message used when a caught throw is not an Error.
 *
 * @example
 *   export async function createDevice(input: DeviceInput) {
 *     return withActionEnvelope(async () => {
 *       const { organizationId } = await requireMember("member");
 *       // ...validation + withTenant work...
 *       return { ok: true, data: { id } };
 *     }, "Failed to create device");
 *   }
 */
export async function withActionEnvelope<T>(
  fn: () => Promise<ActionResult<T>>,
  fallback: string,
): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { ok: false, error: err.message || "You don't have access" };
    }
    return { ok: false, error: describeError(err, fallback) };
  }
}
