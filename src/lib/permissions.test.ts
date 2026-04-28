import { describe, expect, it } from "vitest";
import {
  ROLES,
  ASSIGNABLE_ROLES,
  isRole,
  roleHasAccess,
  roleLabel,
  type Role,
} from "./permissions";

describe("permissions", () => {
  describe("isRole", () => {
    it.each(ROLES)("accepts the canonical role %s", (role) => {
      expect(isRole(role)).toBe(true);
    });

    it.each([
      "",
      "OWNER",
      "Admin",
      "guest",
      "superuser",
      "operator",
      "owner ", // trailing whitespace
      "owner\n",
      "0",
    ])("rejects the non-role %j", (value) => {
      expect(isRole(value)).toBe(false);
    });

    it("narrows the type at the call site", () => {
      const raw: string = "admin";
      // @ts-expect-error — `raw` is `string`, not `Role`, before the guard
      const beforeGuard: Role = raw;
      void beforeGuard;
      if (isRole(raw)) {
        // After the guard `raw` is `Role` — the assignment compiles.
        const afterGuard: Role = raw;
        expect(afterGuard).toBe("admin");
      }
    });
  });

  describe("roleHasAccess", () => {
    // Build the full ranks-vs-required matrix so any reordering of
    // ROLE_RANK is caught immediately.
    const matrix: Array<[Role, Role, boolean]> = [
      ["owner", "owner", true],
      ["owner", "admin", true],
      ["owner", "member", true],
      ["owner", "viewer", true],
      ["admin", "owner", false],
      ["admin", "admin", true],
      ["admin", "member", true],
      ["admin", "viewer", true],
      ["member", "owner", false],
      ["member", "admin", false],
      ["member", "member", true],
      ["member", "viewer", true],
      ["viewer", "owner", false],
      ["viewer", "admin", false],
      ["viewer", "member", false],
      ["viewer", "viewer", true],
    ];

    it.each(matrix)(
      "%s vs required %s → %s",
      (current, required, expected) => {
        expect(roleHasAccess(current, required)).toBe(expected);
      },
    );
  });

  describe("roleLabel", () => {
    it.each(ROLES)("returns a non-empty title-cased label for %s", (role) => {
      const label = roleLabel(role);
      expect(label).toMatch(/^[A-Z][a-z]+$/);
    });
  });

  describe("ASSIGNABLE_ROLES", () => {
    it("excludes owner", () => {
      expect(ASSIGNABLE_ROLES).not.toContain("owner");
    });

    it("contains every non-owner role", () => {
      for (const role of ROLES) {
        if (role === "owner") continue;
        expect(ASSIGNABLE_ROLES).toContain(role);
      }
    });
  });
});
