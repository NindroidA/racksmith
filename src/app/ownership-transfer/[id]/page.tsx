import { redirect } from "next/navigation";
import Link from "next/link";
import { Buildings, Key, Wrench } from "@phosphor-icons/react/dist/ssr";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { OwnershipTransferForm } from "./ownership-transfer-form";

/**
 * Ownership-transfer confirmation landing page. Reached via the link in the
 * handoff email. The target user must be signed in as the recipient — same
 * enumeration-defense pattern as the invite accept page.
 */
export default async function OwnershipTransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.user) {
    const callback = encodeURIComponent(`/ownership-transfer/${id}`);
    redirect(`/login?callbackURL=${callback}`);
  }

  const transfer = await prisma.ownershipTransfer.findUnique({
    where: { id },
    select: {
      id: true,
      organizationId: true,
      fromUserId: true,
      toUserId: true,
      status: true,
      expiresAt: true,
      organization: { select: { id: true, name: true, slug: true } },
      fromUser: { select: { name: true, email: true } },
    },
  });

  const expired = transfer && transfer.expiresAt.getTime() < Date.now();
  const isPending = transfer && transfer.status === "pending";
  const isRecipient = transfer && transfer.toUserId === session.user.id;

  if (!transfer || !isPending || expired) {
    return (
      <Shell>
        <Header
          title="Transfer no longer valid"
          subtitle="This handoff may have expired, been canceled, or already completed."
        />
        <Link
          href="/dashboard"
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          Go to dashboard
        </Link>
      </Shell>
    );
  }

  if (!isRecipient) {
    return (
      <Shell>
        <Header
          title="This transfer isn't for you"
          subtitle="You're signed in as a different account than the intended recipient."
        />
        <Link
          href="/dashboard"
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          Go to dashboard
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-300/15">
          <Key
            weight="duotone"
            className="h-5 w-5 text-amber-200"
            aria-hidden
          />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-white">
            Become owner of {transfer.organization.name}
          </h1>
          <p className="text-xs text-white/50">
            Initiated by {transfer.fromUser.name || transfer.fromUser.email}
          </p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-white/70">
        Accepting promotes you to owner with full control — billing, member
        management, and the ability to delete{" "}
        <span className="font-medium text-white">
          {transfer.organization.name}
        </span>
        . The previous owner becomes an admin.
      </p>
      <p className="mt-3 flex items-center gap-2 text-xs text-white/50">
        <Buildings weight="duotone" className="h-3.5 w-3.5" aria-hidden />
        <span className="mono">/ {transfer.organization.slug}</span>
      </p>

      <OwnershipTransferForm transferId={transfer.id} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="surface-card w-full max-w-md p-8">
        <div className="mb-5 flex items-center gap-2 text-sm text-white/50">
          <Wrench
            weight="duotone"
            className="h-4 w-4 text-primary"
            aria-hidden
          />
          RackSmith
        </div>
        {children}
      </div>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="mt-1 text-sm text-white/60">{subtitle}</p>
    </div>
  );
}
