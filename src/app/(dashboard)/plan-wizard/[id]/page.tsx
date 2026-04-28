import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { PlanWizardShell } from "@/components/network-tools/plan-wizard-shell";
import type { WizardInputs } from "@/lib/plan/wizard-types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function BuildPlanPage({ params }: Props) {
  const { id } = await params;
  const { organizationId } = await requireMember("member");
  const plan = await withTenant(organizationId, (tx) =>
    tx.buildPlan.findFirst({
      where: { id, organizationId },
      select: { id: true, name: true, status: true, inputs: true },
    }),
  );
  if (!plan) notFound();

  return (
    <PlanWizardShell
      planId={plan.id}
      planName={plan.name}
      status={plan.status}
      initialInputs={(plan.inputs ?? {}) as WizardInputs}
    />
  );
}
