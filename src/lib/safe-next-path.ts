// Open-redirect defense for ?next= params. Auth pages take a `next`
// query string telling them where to send the browser after success;
// without validation, an attacker could craft `?next=//evil.example`
// or `?next=https://evil.example` and turn our login/signup into an
// open redirect.
//
// Rules: must start with a single `/`, must not start with `//` (which
// browsers treat as protocol-relative → cross-origin), must not contain
// `\` or whitespace (some browsers normalize backslashes to forward
// slashes, opening `/\evil.example` as a host). Anything that fails
// the rules collapses to the provided fallback.

export function sanitizeNextPath(
  raw: string | undefined,
  fallback: string = "/dashboard",
): string {
  if (typeof raw !== "string") return fallback;
  if (raw.length === 0 || raw.length > 512) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\s\\]/.test(raw)) return fallback;
  return raw;
}
