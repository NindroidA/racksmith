import { getOAuthProviders } from "@/lib/oauth-providers";
import { sanitizeNextPath } from "@/lib/safe-next-path";
import { RegisterForm } from "./register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const oauth = getOAuthProviders();
  const next = sanitizeNextPath(params.next);
  return <RegisterForm oauth={oauth} next={next} />;
}
