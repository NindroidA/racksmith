# design-sync notes — RackSmith → claude.ai/design

Project: **RackSmith Forge** (`projectId` in config.json). Shape: **package** (synth-entry).
RackSmith is a Next.js app, not a published component library — this is an off-envelope sync.

## How it's wired (why each knob exists)

- **Custom bundle entry** (`cfg.entry` → `.design-sync/entry.tsx`): re-exports ONLY the 14 `src/components/ui/*` primitives. Without it, the converter would synth an entry that re-exports *all* of `src/`, dragging server actions / Prisma / `next/headers` into the browser bundle (fatal). Props/`.d.ts` still come from each component's real source via `cfg.componentSrcMap`.
- **`buildCmd` = `bash .design-sync/compile-css.sh`**: compiles Tailwind v4 (`src/app/globals.css` → `.design-sync/.cache/forge-compiled.css`, which `cfg.cssEntry` points at). **Run it before `package-build.mjs` on every (re)sync** — the compiled CSS is gitignored, so a fresh clone has none until this runs.
- **`tsconfig.build.json`** (`cfg.tsconfig`): MUST stay clean JSON. The converter's tsconfig-paths plugin strips comments before `JSON.parse`; a `"//"` *key* breaks the parse, the plugin silently returns null, and esbuild falls back to the root tsconfig (which lacks the `next/link` shim) → Next internals leak into the bundle (`process is not defined`). `baseUrl: ".."` anchors paths to the repo root. The exact `@/types` → `src/types/index.ts` mapping must come BEFORE the `@/*` wildcard (the plugin matches the `src/types` directory via its empty-extension probe before trying `/index.ts`).
- **`next/link` shim** (`.design-sync/shims/next-link.tsx`): a plain `<a>`. `EmptyStateWithTemplate` imports `next/link`, which renders blank outside an app-router tree.
- **Fonts** (`cfg.extraFonts` → `.design-sync/fonts.css` + `fonts/*.woff2`): the app loads IBM Plex Sans + Geist Mono via `next/font/google`, which the bundle can't use, so we ship the same families (latin subset, OFL, from `@fontsource`).
- **Preview frame** (`cfg.provider` = `ForgePreview`, merged via `cfg.extraEntries` → `.design-sync/preview-frame.tsx`): wraps every preview in the Amethyst base `#0e0b1c`. REQUIRED — the preview harness forces a white `<body>` (hardcoded in `lib/emit.mjs`, must not fork), and Forge components are light-on-dark, so secondary/ghost buttons + glass surfaces + `text-white/*` vanish on white.

## Capture-harness quirk (overlays)

`package-capture.mjs` runs a frozen clock (`page.clock.setFixedTime`), which freezes framer-motion ENTER animations at `opacity:0` — modals/galleries screenshot blank. `.design-sync/previews/_capture.tsx` (preview-only, imported by Dialog/DeleteConfirmDialog/TemplateGallery) fixes this two ways:
1. `MotionGlobalConfig.skipAnimations = true` on the bundle's framer-motion instance (reached via the re-export in `preview-frame.tsx`). This is what makes **TemplateGallery** render — it does NOT call `useReducedMotion()`, so the matchMedia shim alone wouldn't help it.
2. A `matchMedia` reduced-motion shim (helps components that *do* honor `useReducedMotion`, e.g. Dialog).
Both are preview-only; the shipped bundle never sets them, so real designs keep their animations.

## Chromium

Installed via the repo's pinned `playwright@1.59.1` → `chromium-1217`, at `~/Library/Caches/ms-playwright` (macOS path, NOT `~/.cache`). Run build/validate/capture with the sandbox disabled so Chromium can launch.

## Known render warns / not-captured states

- Render check is 14/14 clean; no outstanding warns.
- Interaction-only states are intentionally not captured (shown at rest): `Select`/`SelectOption` open listbox, `Tooltip` hover bubble.
- All overlay modals show a faint blurred edge at the top of the capture (a `backdrop-blur` viewport-edge artifact) — cosmetic, graded good.

## Re-sync risks (watch-list for the next run)

- **Recompile CSS first.** `.cache/forge-compiled.css` is gitignored; re-sync must run `buildCmd` (or `compile-css.sh`) before the converter, else `cssEntry` is missing. The driver does not auto-run it — do it manually or via the driver's buildCmd handling.
- **Tailwind class coverage.** Previews reuse classes already used in `src/`; Tailwind v4 auto-detects `.design-sync/previews/` (committed). A future preview using a brand-new utility needs a CSS recompile before capture.
- **framer-motion API.** The `MotionGlobalConfig.skipAnimations` lever depends on framer-motion 12.x. A major bump could change it; `_capture.tsx` has a try/catch fallback to the reduced-motion shim, but verify TemplateGallery still renders after any framer-motion upgrade.
- **Extra bundle exports.** `window.RackSmith` includes `ForgePreview` + `MotionGlobalConfig` (preview-harness helpers, intentional — the provider must be a bundle export). They get no component cards, so the design agent won't surface them.
- **Grouping.** All 14 components are under the `general` group (flat). To group them in the DS pane, add `cfg.docsMap` stubs with `category:` frontmatter.
- **Re-verify render status.** The "14/14 clean" above is a snapshot. On re-sync, confirm the render check is still clean and check validate's warn lines against this file *before* capture/upload — a component or dependency change can introduce new warns that would otherwise be inherited silently.
- **Scope.** Only `src/components/ui/*` primitives are synced. Domain components (dashboard/device/rack/…) pull in server/data and are intentionally excluded.
