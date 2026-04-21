# Contributing to RackSmith

Thanks for your interest — RackSmith is in a **building-in-private** window
(no public launch yet — see
[`.plans/2026-04-18/01-new-direction-full-build.md`](.plans/2026-04-18/01-new-direction-full-build.md)),
so the contribution surface is narrower than it'll be after launch. Read
this before opening a PR.

## What we're accepting right now

- **Bug reports** — always welcome. File an issue with reproduction steps,
  screenshots, and your environment (OS, browser, Docker / bun, the output
  of `/api/health`).
- **Small, targeted PRs** — typos, broken links, missing accessibility
  attributes, obvious bug fixes with a minimal diff.
- **Documentation improvements** — typos, clarifications, examples.

## What we're *not* accepting right now

- **Large features or refactors** — the v1 roadmap is locked
  (see `.plans/`). We'll open the door wider once GA ships.
- **New dependencies** — raise an issue first. Every new package increases
  the maintenance surface and image size.
- **Cosmetic-only restyles** — the design system is intentional. Open an
  issue to discuss.
- **Plugins, integrations, or extension points** — architecture for those
  lands post-GA.

## Before you open a PR

1. **Open an issue first** for anything non-trivial and get a 👍 before
   writing code.
2. **Stay inside one concern per PR.** A bug fix and a refactor are two PRs.
3. **Run the checks locally:**
   ```bash
   bun run typecheck
   bun run test          # vitest unit tests
   bun run test:e2e      # playwright smoke (needs the dev DB running)
   bun run build
   ```
4. **Don't change dependencies** unless the PR body explains why.
5. **Match the existing style** — Prettier-compatible formatting, double
   quotes, Tailwind for styles, lucide-react for icons, `toast.error` for
   user-facing errors.

## Security issues

**Don't** open a public issue for a vulnerability. Follow the process in
[`SECURITY.md`](SECURITY.md).

## License

By submitting a PR, you agree your contribution is licensed under the
project's MIT license (see [`LICENSE`](LICENSE)).
