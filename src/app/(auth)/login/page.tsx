import { getOAuthProviders } from "@/lib/oauth-providers";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const oauth = getOAuthProviders();
  return <LoginForm oauth={oauth} />;
}
