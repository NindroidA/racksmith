import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  X,
  Server,
  HardDrive,
  Network,
  Radar,
  Lock,
  Package,
  Sparkles,
  Wrench,
  Rocket,
} from "lucide-react";
import { GithubIcon } from "@/components/ui/oauth-icons";

const FEATURES = [
  {
    icon: Server,
    title: "Visual Rack Builder",
    description:
      "Drag and drop devices into U-slots. Real 10.86:1 aspect ratios. Authentic brand-specific faceplates. It's accurate documentation that happens to look beautiful.",
    color: "text-accent-blue",
    bg: "bg-accent-blue/15",
  },
  {
    icon: HardDrive,
    title: "Device Inventory",
    description:
      "23 seeded enterprise devices, custom creation, CSV bulk import. Search, filter, sort. Every device gets a unique rendered faceplate, not a generic icon.",
    color: "text-accent-purple",
    bg: "bg-accent-purple/15",
  },
  {
    icon: Network,
    title: "Network Topology",
    description:
      "Interactive React Flow canvas. Drag nodes, wire connections between handles, color-coded cable types, export as PNG. Finally a diagram that stays in sync.",
    color: "text-accent-cyan",
    bg: "bg-accent-cyan/15",
  },
  {
    icon: Radar,
    title: "Auto-Discovery",
    description:
      "Point at a subnet, click scan, populate your inventory. nmap ping-scan under the hood. Pending-device queue — approve, assign, or ignore each host.",
    color: "text-accent-green",
    bg: "bg-accent-green/15",
  },
  {
    icon: Package,
    title: "Beautiful by Default",
    description:
      "9 brand palettes researched and desaturated for dark mode. UniFi gets a touchscreen. Cisco gets its LED column. Dell gets its bottom badge. Recognizable at a glance.",
    color: "text-accent-orange",
    bg: "bg-accent-orange/15",
  },
  {
    icon: Lock,
    title: "Self-Hostable",
    description:
      "Ships as a Docker Compose stack with a multi-stage image, healthchecks, and migrations on boot. Email + password auth out of the box, optional GitHub/Google OAuth, TOTP 2FA, password reset, and a per-user audit log.",
    color: "text-accent-red",
    bg: "bg-accent-red/15",
  },
];

const SCREENSHOTS = [
  {
    src: "/screenshots/dashboard.png",
    title: "Dashboard",
    description:
      "Live counts, recent activity, and recommendations across your entire fleet at a glance.",
  },
  {
    src: "/screenshots/rack-builder.png",
    title: "Rack Builder",
    description:
      "Drag devices into U-slot precision. Live utilization. Search the catalog without leaving the page.",
  },
  {
    src: "/screenshots/topology.png",
    title: "Network Topology",
    description:
      "Wire devices together. Edges colored by cable type. Labels show bandwidth + VLAN.",
  },
  {
    src: "/screenshots/devices.png",
    title: "Device Inventory",
    description:
      "Mini faceplates in every row. Search, filter, sort. CSV import for existing docs.",
  },
  {
    src: "/screenshots/discovery.png",
    title: "Auto-Discovery",
    description:
      "Scan a subnet. Review the pending queue. Add, assign, or ignore each host.",
  },
];

const COMPARISON = {
  columns: ["RackSmith", "NetBox", "draw.io", "Hudu"],
  rows: [
    { label: "Beautiful UI", values: [true, false, true, false] },
    { label: "Rack visualization", values: [true, "basic", "manual", "basic"] },
    { label: "Device inventory", values: [true, true, false, true] },
    { label: "Network topology", values: [true, "plugin", "manual", false] },
    { label: "Auto-discovery", values: [true, false, false, false] },
    { label: "Self-hostable", values: [true, true, true, false] },
    {
      label: "Price",
      values: ["Free & OSS", "Free / $7.5K+", "Free", "$31+/mo"],
    },
    {
      label: "Setup time",
      values: ["5 min", "hours", "minutes", "account required"],
    },
  ],
};

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    audience: "For homelabbers",
    features: [
      "1 site",
      "Up to 3 racks",
      "Unlimited devices",
      "Auto-discovery (nmap)",
      "Full topology canvas",
      "All 9 brand faceplates",
      "CSV import",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: true,
    comingSoon: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month or $89/year",
    audience: "For small IT teams",
    features: [
      "Everything in Free, plus:",
      "Unlimited sites & racks",
      "Team members (up to 5)",
      "API access",
      "PDF / CSV / SVG exports",
      "Audit log viewer",
      "Priority support",
    ],
    cta: "Join waitlist",
    highlighted: false,
    comingSoon: true,
  },
  {
    name: "Business",
    price: "$29",
    period: "/user/month",
    audience: "For MSPs",
    features: [
      "Everything in Pro, plus:",
      "Unlimited team",
      "Client workspaces",
      "White-label branding",
      "SSO (OIDC)",
      "Advanced audit logs",
      "Vendor-neutral config export",
    ],
    cta: "Join waitlist",
    highlighted: false,
    comingSoon: true,
  },
];

const TECH_STACK: { name: string; classes: string }[] = [
  { name: "Next.js 16", classes: "bg-white/[0.08] border-white/20 text-white" },
  { name: "Bun", classes: "bg-pink-400/15 border-pink-400/30 text-pink-200" },
  {
    name: "TypeScript",
    classes: "bg-blue-500/15 border-blue-500/30 text-blue-200",
  },
  {
    name: "Tailwind 4",
    classes: "bg-cyan-400/15 border-cyan-400/30 text-cyan-200",
  },
  {
    name: "PostgreSQL 17",
    classes: "bg-indigo-500/15 border-indigo-500/30 text-indigo-200",
  },
  {
    name: "Prisma",
    classes: "bg-teal-400/15 border-teal-400/30 text-teal-200",
  },
  {
    name: "Better Auth",
    classes: "bg-purple-500/15 border-purple-500/30 text-purple-200",
  },
  {
    name: "React Flow",
    classes: "bg-orange-400/15 border-orange-400/30 text-orange-200",
  },
  {
    name: "nmap",
    classes: "bg-green-500/15 border-green-500/30 text-green-200",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.08] bg-[#0a0e1a]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <span className="gradient-text text-lg font-bold">RackSmith</span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="#features"
              className="hidden text-sm text-white/60 transition-colors hover:text-white md:block"
            >
              Features
            </a>
            <a
              href="#screenshots"
              className="hidden text-sm text-white/60 transition-colors hover:text-white md:block"
            >
              Screenshots
            </a>
            <a
              href="#pricing"
              className="hidden text-sm text-white/60 transition-colors hover:text-white md:block"
            >
              Pricing
            </a>
            <a
              href="https://github.com/nindroid-systems/racksmith"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white md:flex"
            >
              <GithubIcon className="h-4 w-4" />
              GitHub
            </a>
            <Link
              href="/login"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-32 text-center">
        {/* Background orbs */}
        <div
          className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full opacity-30 blur-3xl"
          style={{
            background: "radial-gradient(closest-side, #3b82f6, transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-40 top-40 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(closest-side, #8b5cf6, transparent)",
          }}
        />

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white/70">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-orange" />
          In development · Pre-launch · Early preview
        </div>

        <h1 className="max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl">
          Your infrastructure,{" "}
          <span className="gradient-text">beautifully documented.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60 md:text-xl">
          Rack visualization, device inventory, network topology, and
          auto-discovery — in one modern tool. NetBox is overkill. draw.io is
          too manual.{" "}
          <span className="text-white">RackSmith is the middle ground.</span>
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30"
          >
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com/nindroid-systems/racksmith"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-button flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white"
          >
            <GithubIcon className="h-4 w-4" />
            Star on GitHub
          </a>
        </div>

        <p className="mt-6 text-xs text-white/40">
          Runs locally with one{" "}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono">
            docker compose up
          </code>{" "}
          · No account needed for self-hosted
        </p>

        {/* Hero screenshot */}
        <div className="relative mt-16 w-full max-w-6xl">
          <div className="glass-card overflow-hidden rounded-2xl p-2 shadow-2xl">
            <Image
              src="/screenshots/rack-builder.png"
              alt="RackSmith rack builder showing a populated rack with drag-and-drop devices"
              width={1440}
              height={900}
              className="rounded-xl"
              priority
            />
          </div>
          {/* Fade-out at bottom for subtle scroll suggestion */}
          <div
            className="pointer-events-none absolute inset-x-0 -bottom-2 h-32"
            style={{
              background: "linear-gradient(to top, #0a0e1a, transparent)",
            }}
          />
        </div>
      </section>

      {/* Stat strip / social proof */}
      <section className="border-y border-white/[0.06] bg-white/[0.02] py-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-6 text-center md:grid-cols-4">
          <div>
            <div className="text-3xl font-bold text-white">9</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-white/50">
              Brand palettes
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">8</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-white/50">
              Device types rendered
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">
              10.86<span className="text-white/40">:1</span>
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-white/50">
              Real rack proportions
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">5 min</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-white/50">
              From zero to documented
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="text-4xl font-bold text-white md:text-5xl">
            Everything you need.{" "}
            <span className="gradient-text">Nothing you don't.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            From a single homelab rack to multi-site MSP deployments. Built for
            the middle 80% of users every other tool ignores.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="glass-card rounded-2xl p-6 transition-transform hover:-translate-y-1"
              >
                <div className={`mb-4 inline-flex rounded-xl ${f.bg} p-2.5`}>
                  <Icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/60">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Screenshots */}
      <section id="screenshots" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="text-4xl font-bold text-white md:text-5xl">
            See it in action
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            Real screenshots. No mockups. Hover any device for details.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {SCREENSHOTS.map((shot, i) => (
            <div
              key={shot.title}
              className={`glass-card overflow-hidden rounded-2xl ${
                i === 0 ? "md:col-span-2" : ""
              }`}
            >
              <div className="overflow-hidden bg-black/40 p-1.5">
                <Image
                  src={shot.src}
                  alt={shot.title}
                  width={1440}
                  height={900}
                  className="rounded-xl"
                />
              </div>
              <div className="p-5">
                <h3 className="mb-1 text-base font-semibold text-white">
                  {shot.title}
                </h3>
                <p className="text-sm text-white/55">{shot.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Competitive comparison */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-white md:text-5xl">
            Built for the gap
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            NetBox is overkill. draw.io is too manual. Hudu is expensive.
            RackSmith is what you wish you had.
          </p>
        </div>

        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-4 text-left font-normal text-white/40"></th>
                {COMPARISON.columns.map((c, i) => (
                  <th
                    key={c}
                    className={`p-4 text-center font-semibold ${
                      i === 0 ? "text-primary" : "text-white/70"
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {COMPARISON.rows.map((row) => (
                <tr key={row.label}>
                  <td className="p-4 text-sm text-white/70">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td
                      key={i}
                      className={`p-4 text-center text-sm ${
                        i === 0 ? "bg-primary/[0.04]" : ""
                      }`}
                    >
                      {typeof v === "boolean" ? (
                        v ? (
                          <Check
                            className={`mx-auto h-5 w-5 ${
                              i === 0 ? "text-accent-green" : "text-white/40"
                            }`}
                          />
                        ) : (
                          <X className="mx-auto h-5 w-5 text-white/20" />
                        )
                      ) : (
                        <span
                          className={i === 0 ? "text-white" : "text-white/50"}
                        >
                          {v}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="text-4xl font-bold text-white md:text-5xl">
            Start free.{" "}
            <span className="gradient-text">Scale when you're ready.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            Free forever for homelabs. Paid tiers unlock sites, teams, API, and
            exports — only pay when you actually outgrow the free tier.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PRICING.map((tier) => (
            <div
              key={tier.name}
              className={
                tier.highlighted
                  ? "glass-card relative rounded-2xl border border-primary/40 p-8 shadow-xl shadow-primary/10 hover:-translate-y-1"
                  : "glass-card relative rounded-2xl p-8 opacity-75 hover:-translate-y-1"
              }
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                  Free forever
                </div>
              )}
              {tier.comingSoon && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/60">
                  Post-launch
                </div>
              )}
              <div className="mb-1 text-sm text-white/50">{tier.audience}</div>
              <h3 className="mb-4 text-2xl font-bold text-white">
                {tier.name}
              </h3>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">
                  {tier.price}
                </span>
                <span className="text-sm text-white/50">{tier.period}</span>
              </div>
              <ul className="mb-8 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-green" />
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.comingSoon ? "#final-cta" : "/register"}
                className={
                  tier.highlighted
                    ? "block rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-white transition-all hover:bg-primary/90"
                    : "glass-button block rounded-lg px-4 py-2.5 text-center text-sm font-medium text-white"
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-white/60">
            <span className="font-semibold text-white/80">Self-hosting?</span>{" "}
            You get the full Free tier (1 site, 3 racks, unlimited devices) with
            no license needed. Pro and Business tiers are{" "}
            <span className="font-semibold text-white/75">
              hosted-only at launch
            </span>{" "}
            — self-host paid licensing (signed keys, instance-bound) is planned
            for post-v1 release so it's done properly.
          </p>
          <p className="mt-2 text-xs text-white/40">
            Free tier will always be free. Paid tiers unlock when hosted service
            launches.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section
        id="final-cta"
        className="mx-auto max-w-4xl px-6 py-28 text-center"
      >
        <h2 className="text-4xl font-bold leading-tight text-white md:text-5xl">
          Start documenting in <span className="gradient-text">5 minutes.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-white/60">
          Your rack deserves better than a spreadsheet. Ship a beautiful network
          doc tonight.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
          >
            <Rocket className="h-4 w-4" />
            Get Started Free
          </Link>
          <a
            href="https://github.com/nindroid-systems/racksmith"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-button flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white"
          >
            <GithubIcon className="h-4 w-4" />
            View on GitHub
          </a>
        </div>
      </section>

      {/* Tech stack */}
      <section className="border-y border-white/[0.06] bg-white/[0.02] py-14">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-6 flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-white/40">
            <Sparkles className="h-3.5 w-3.5" />
            Built with modern tech
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {TECH_STACK.map((t) => (
              <span
                key={t.name}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${t.classes}`}
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-white/40 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/20">
              <Wrench className="h-3 w-3 text-primary" />
            </div>
            <span className="gradient-text font-semibold">RackSmith</span>
            <span className="ml-2 text-white/30">
              Built by{" "}
              <a
                href="https://nindroid.systems"
                className="underline-offset-2 hover:underline"
              >
                Nindroid Systems
              </a>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="https://github.com/nindroid-systems/racksmith"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              GitHub
            </a>
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
            <Link href="/login" className="hover:text-white">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
