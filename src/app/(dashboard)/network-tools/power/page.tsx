import { requireUser } from "@/lib/auth-helpers";
import { PowerCalculatorClient } from "@/components/network-tools/power-calculator-client";

export default async function PowerPage() {
  await requireUser();

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Power budget</h1>
        <p className="mt-1 text-sm text-white/60">
          Size PoE budgets, PDU circuits, and UPS runtime. Math is local —
          tweak inputs and see the impact instantly.
        </p>
      </header>

      <PowerCalculatorClient />
    </div>
  );
}
