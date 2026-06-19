# RackSmith "Forge" — building with this design system

RackSmith is **dark-theme** infrastructure UI. Components are client-side React; import them by name (`Button`, `Tag`, `Dialog`, `Select`, …). There is **no theme provider to wrap** — load `styles.css` and render.

**Build on the Amethyst base.** Every screen sits on `var(--color-base)` (`#0e0b1c`); `styles.css` already applies it to `html`. **Critical:** these are light-on-dark components — secondary/ghost `Button`s, the `.glass-*` surfaces, and any `text-white/NN` text are invisible on a light background. If you set a page/container background, use `var(--color-base)` or a `surface-*` class — never a light one.

## Styling idiom — Tailwind 4 + Forge tokens

Style your own layout glue with Tailwind utilities that resolve against the Forge `@theme`. Use this system's vocabulary, not generic greys:

**Surfaces (custom classes — use these for panels):**

| Class | Use |
|---|---|
| `surface-card` | content cards |
| `surface-elevated` | raised panels |
| `surface-accent` | the single "primary action" surface per view (brand-gradient left edge) |
| `surface-interactive` | clickable cards (hover lift) |
| `glass-card` / `glass-panel` / `glass` | **overlays ONLY** — modals, dropdowns, command palette. Never a content card. |
| `glass-input` | form fields |

**Color (Tailwind utilities):** `bg-surface`, `bg-surface-raised`, `bg-primary` (Smithian Indigo `#5765f4` — the restrained brand accent), `text-accent-{blue,purple,cyan,green,orange,red}`, and opacity text like `text-white/70`. Color earns its place; reach for accents only at attention moments.

**Data + status (the Forge identity):**
- Wrap IPs, CIDRs, MACs, ports, VLAN IDs, counts, prices, timestamps, and IDs in `<span className="mono">` (Geist Mono).
- Status uses `led-dot` + `led-dot--{green,amber,red,muted}`, **always paired with a text label** — never color alone.
- Prose helpers: `txt-strong`, `txt-body`, `txt-muted`, `txt-faint`.

**Type & radii:** IBM Plex Sans for prose/labels, Geist Mono (`.mono`) for data. Corner radii via `--r-control` (controls), `--r-card` (cards), `--r-surface`.

**Where the truth lives:** read `_ds/<folder>/styles.css` and its `@import`s (`_ds_bundle.css`, `fonts/fonts.css`) for the full token set, and each component's `<Name>.d.ts` (props) + `<Name>.prompt.md` (usage) before composing.

## Idiomatic example — a device row

```tsx
<div className="surface-card flex items-center justify-between gap-4 px-4 py-3">
  <div>
    <div className="font-medium text-white">core-sw-01</div>
    <div className="mono text-xs txt-muted">10.0.10.2 · 48-port · VLAN 10</div>
  </div>
  <div className="flex items-center gap-3">
    <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
      <span className="led-dot led-dot--green" /> Online
    </span>
    <Tag tone="info" variant="subtle">Trunk</Tag>
    <Button variant="secondary" size="sm">Manage</Button>
  </div>
</div>
```
