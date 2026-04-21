import { requireUser } from "@/lib/auth-helpers";
import { CableEstimatorClient } from "@/components/network-tools/cable-estimator-client";

export default async function CablesPage() {
  await requireUser();

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Cable length estimator</h1>
        <p className="mt-1 text-sm text-white/60">
          Estimate cable runs and a bill of materials. Reach limits + speed
          mismatches are flagged in red.
        </p>
      </header>

      <CableEstimatorClient />
    </div>
  );
}
