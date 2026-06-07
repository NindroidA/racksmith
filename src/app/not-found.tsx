import Link from "next/link";
import { Wrench, Compass } from "@phosphor-icons/react/dist/ssr";
import { GITHUB_REPO_URL } from "@/lib/links";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="surface-card w-full max-w-md p-8 text-center">
        <div className="mb-4 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <Wrench weight="duotone" className="h-7 w-7 text-primary" />
          </div>
          <h1 className="gradient-text mb-1 text-2xl font-bold">RackSmith</h1>
          <p className="text-xs uppercase tracking-wider text-white/40">
            404 · Not found
          </p>
        </div>

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
            <Compass weight="duotone" className="h-6 w-6 text-white/60" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-white">
            That page doesn&apos;t exist
          </h2>
          <p className="text-sm text-white/60">
            The link might be broken, or the page has moved.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Take me home
          </Link>
          <a
            href={`${GITHUB_REPO_URL}/issues/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.1]"
          >
            Report if broken
          </a>
        </div>
      </div>
    </div>
  );
}
