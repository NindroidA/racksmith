import { getOAuthProviders } from "@/lib/oauth-providers";
import { sanitizeNextPath } from "@/lib/safe-next-path";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  // Accept both spellings defensively: Better Auth's convention is
  // `callbackURL`, which is what we now write everywhere — but a stale
  // bookmark or in-flight redirect with the lowercase `callbackUrl`
  // shouldn't strand the user on /dashboard.
  searchParams: Promise<{ callbackURL?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const oauth = getOAuthProviders();
  const callbackURL = sanitizeNextPath(
    params.callbackURL ?? params.callbackUrl,
  );
  return <LoginForm oauth={oauth} callbackURL={callbackURL} />;
}
