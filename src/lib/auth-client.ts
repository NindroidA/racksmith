import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

// Prefer the current origin so the deployed URL doesn't have to be baked into
// the client bundle at build time. NEXT_PUBLIC_BETTER_AUTH_URL can still
// override (useful for split frontend/backend domains).
const baseURL =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
  (typeof window !== "undefined" ? window.location.origin : undefined);

export const authClient = createAuthClient({
  ...(baseURL ? { baseURL } : {}),
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect: () => {
        window.location.href = "/two-factor-verify";
      },
    }),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  twoFactor,
} = authClient;
