import { getOAuthProviders } from "@/lib/oauth-providers";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  const oauth = getOAuthProviders();
  return <RegisterForm oauth={oauth} />;
}
