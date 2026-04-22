// Client-safe error-to-string helper. Pulled out of action-helpers.ts
// because that module imports `ForbiddenError` from auth-helpers.ts, which
// transitively pulls `next/headers` — safe on the server, but tainted for
// client bundles. This file has zero server dependencies so both client
// components (toast.error) and server actions can import it.

/**
 * Extract a useful message from a thrown value. Better Auth's `APIError`
 * exposes a reliable `message`; other Errors are used as-is. Falls back
 * to the provided `fallback` for non-Error throws.
 */
export function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    return err.message || fallback;
  }
  return fallback;
}
