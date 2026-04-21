import { redirect } from "next/navigation";
import { createBuildPlan } from "../actions";

// One-shot redirect page: create a fresh plan, then send the user into the
// wizard for it. On tier denial, bounce back to the list with the error
// surfaced via a `?error=` query param (the list page picks it up and
// displays it as a banner — see plan-wizard/page.tsx).
export default async function NewBuildPlanPage() {
  const result = await createBuildPlan({ name: "Untitled plan" });
  if (!result.ok) {
    const params = new URLSearchParams({ error: result.error });
    redirect(`/network-tools/plan-wizard?${params.toString()}`);
  }
  redirect(`/network-tools/plan-wizard/${result.data.id}`);
}
