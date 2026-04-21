/**
 * Organization-slug utilities. Slugs identify organizations in URLs and need
 * to (a) avoid collisions with existing routes, (b) avoid words that could be
 * confused with system surfaces, and (c) be URL-safe.
 *
 * The blocklist is intentionally conservative — collisions between an org
 * slug like `"settings"` and the actual `/settings` route would be a bad
 * surprise even if Next.js routes win the lookup. Future-proof against new
 * top-level routes by keeping common admin/auth/billing/system terms blocked.
 */

const RESERVED_SLUGS = new Set<string>([
  // Existing top-level routes
  "admin",
  "api",
  "auth",
  "dashboard",
  "devices",
  "discovery",
  "forgot-password",
  "invite",
  "login",
  "logout",
  "network-tools",
  "onboarding",
  "ownership-transfer",
  "racks",
  "reset-password",
  "settings",
  "signin",
  "signout",
  "signup",
  "topology",
  "two-factor-verify",
  "verify-email",
  // Reserved for future routes / common confusion
  "account",
  "billing",
  "blog",
  "docs",
  "help",
  "mail",
  "marketplace",
  "organization",
  "organizations",
  "privacy",
  "private",
  "public",
  "register",
  "reset-password",
  "search",
  "security",
  "smtp",
  "status",
  "support",
  "system",
  "terms",
  "user",
  "users",
  "webhook",
  "www",
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Validate a candidate organization slug.
 *
 * @returns `null` when valid; an error message string otherwise.
 */
export function validateSlug(slug: string): string | null {
  const trimmed = slug.trim();
  if (trimmed.length < 2) return "Slug must be at least 2 characters";
  if (trimmed.length > 63) return "Slug must be 63 characters or fewer";
  if (!SLUG_PATTERN.test(trimmed)) {
    return "Slug must use lowercase letters, numbers, and hyphens (no leading/trailing hyphen)";
  }
  if (RESERVED_SLUGS.has(trimmed)) {
    return `"${trimmed}" is reserved — pick a different slug`;
  }
  return null;
}

/**
 * Generate a slug from an arbitrary display name. Lowercases, strips
 * non-alphanumerics, collapses dashes, trims to 50 chars, then appends the
 * caller-supplied `suffix` (typically 6 random chars minted at the call
 * site) for collision resistance on auto-create.
 */
export function generateSlugFromName(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const safe = base.length >= 2 ? base : "org";
  return `${safe}-${suffix}`;
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.trim());
}
