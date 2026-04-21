/**
 * Organization role hierarchy and access-check helpers.
 *
 * Roles are stored as strings in `Member.role`. This module centralizes the
 * ordering and the check logic so action files can say `requireMember("admin")`
 * and trust that owners also pass.
 */

export const ROLES = ["owner", "admin", "member", "viewer"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Roles that an admin can assign to a member. `owner` is excluded — there
 * is exactly one owner per org and it moves via the explicit
 * ownership-transfer flow, not role assignment.
 *
 * Declared as a `readonly` tuple so `z.enum(ASSIGNABLE_ROLES)` keeps the
 * literal union type on the parsed value.
 */
export const ASSIGNABLE_ROLES = ["admin", "member", "viewer"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

// Higher numbers = more access. `owner` > `admin` > `member` > `viewer`.
const ROLE_RANK: Record<Role, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/**
 * Returns true when `current` role is at or above `required`.
 *
 * @example
 *   roleHasAccess("owner", "member")  // true — owner outranks member
 *   roleHasAccess("viewer", "member") // false — viewer is below member
 *   roleHasAccess("admin", "admin")   // true — exact match passes
 */
export function roleHasAccess(current: Role, required: Role): boolean {
  return ROLE_RANK[current] >= ROLE_RANK[required];
}

/**
 * Returns a human-readable label for the role (used in invite UI + emails).
 */
export function roleLabel(role: Role): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "member":
      return "Member";
    case "viewer":
      return "Viewer";
  }
}
