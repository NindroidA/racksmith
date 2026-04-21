import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  twoFactor,
  organization,
  createAccessControl,
} from "better-auth/plugins";
import {
  adminAc,
  memberAc,
  ownerAc,
  defaultStatements,
} from "better-auth/plugins/organization/access";
import { prisma } from "./prisma";
import { sendEmail } from "./email";
import {
  getMembershipLimitForOrganization,
  getOrganizationLimitForUser,
} from "./tiers";
import {
  organizationInviteEmail,
  passwordResetEmail,
  verificationEmail,
} from "./email-templates";

const BASE_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

// Access control: extends BA's defaults with a read-only `viewer` role.
// BA's `newRole({})` types as `Role<never>` — incompatible with the
// plugin's `Role<any>` expectation — so we give viewer an explicit empty
// statement on each known statement key. No permissions granted; our
// `requireMember` also blocks mutations at the application layer
// (defense in depth).
const statement = { ...defaultStatements } as const;
const ac = createAccessControl(statement);
const viewerAc = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: [],
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      const resetUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
      const tpl = passwordResetEmail(resetUrl);
      await sendEmail({ to: user.email, ...tpl });
    },
    resetPasswordTokenExpiresIn: 60 * 60,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const withCallback = url.includes("callbackURL=")
        ? url
        : `${url}${url.includes("?") ? "&" : "?"}callbackURL=/verify-email`;
      const verifyUrl = withCallback.startsWith("http")
        ? withCallback
        : `${BASE_URL}${withCallback}`;
      const tpl = verificationEmail(verifyUrl);
      await sendEmail({ to: user.email, ...tpl });
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!(
        process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ),
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
    },
  },
  plugins: [
    twoFactor(),
    organization({
      ac,
      roles: {
        owner: ownerAc,
        admin: adminAc,
        member: memberAc,
        viewer: viewerAc,
      },
      creatorRole: "owner",
      allowUserToCreateOrganization: true,
      // Cap how many organizations a user can be in, derived from their
      // highest-tier membership plan (Free=3, Pro=10, Business=unlimited).
      // BA's contract: function returns `true` to deny ("limit reached").
      organizationLimit: async (user) => {
        const cap = await getOrganizationLimitForUser(user.id);
        if (!Number.isFinite(cap)) return false;
        const current = await prisma.member.count({
          where: { userId: user.id },
        });
        return current >= cap;
      },
      // Cap members per organization, derived from the org's plan.
      // Free=1, Pro=5, Business=unlimited.
      membershipLimit: async (_user, organization) => {
        return getMembershipLimitForOrganization(organization.id);
      },
      // Per handoff §13c — flat 50 pending invites per org regardless of
      // plan. Blast-radius cap; Resend's send-rate limit is the real
      // throughput gate.
      invitationLimit: 50,
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
      sendInvitationEmail: async (data) => {
        const acceptUrl = `${BASE_URL}/invite/${data.id}`;
        const inviterName =
          (data as { inviter?: { user?: { name?: string } } }).inviter?.user
            ?.name ?? "A teammate";
        const tpl = organizationInviteEmail({
          organizationName: data.organization.name,
          inviterName,
          role: String(data.role),
          acceptUrl,
        });
        await sendEmail({ to: data.email, ...tpl });
      },
    }),
  ],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory",
    customRules: {
      "/sign-in/email": { window: 900, max: 5 },
      "/sign-up/email": { window: 3600, max: 3 },
      "/request-password-reset": { window: 3600, max: 3 },
      "/send-verification-email": { window: 3600, max: 3 },
      "/change-password": { window: 3600, max: 10 },
      "/two-factor/enable": { window: 3600, max: 5 },
      "/two-factor/disable": { window: 3600, max: 5 },
      "/two-factor/verify-totp": { window: 300, max: 10 },
      "/two-factor/verify-backup-code": { window: 300, max: 5 },
      // Phase 10: invite rate limits (per BA's default endpoint names)
      "/organization/invite-member": { window: 3600, max: 10 },
      "/organization/accept-invitation": { window: 60, max: 10 },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },
      banned: {
        type: "boolean",
        defaultValue: false,
      },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({
        user,
        newEmail,
        url,
      }: {
        user: { email: string };
        newEmail: string;
        url: string;
      }) => {
        const verifyUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
        const tpl = verificationEmail(verifyUrl);
        await sendEmail({
          to: newEmail,
          subject: `Confirm email change for ${user.email}`,
          html: tpl.html,
          text: tpl.text,
        });
      },
    },
    deleteUser: {
      enabled: true,
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
