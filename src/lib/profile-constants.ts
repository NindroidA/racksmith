// Shared profile-onboarding constants. Lives outside "use server" boundaries
// so client components can import them without Next.js's export-only-functions
// rule firing against the server-actions module.

export const PROFILE_ROLES = [
  "homelab",
  "small_it",
  "msp",
  "exploring",
] as const;

export const PROFILE_SCALES = ["1_rack", "2_5_racks", "6_plus"] as const;

export const PROFILE_USES = [
  "document",
  "plan",
  "audit",
  "train",
  "other",
] as const;

export type ProfileRole = (typeof PROFILE_ROLES)[number];
export type ProfileScale = (typeof PROFILE_SCALES)[number];
export type ProfileUse = (typeof PROFILE_USES)[number];

export type SaveProfileInput = {
  profileRole?: ProfileRole | null;
  profileScale?: ProfileScale | null;
  profileUse?: ProfileUse | null;
  skipped?: boolean;
};
