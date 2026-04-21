# Device Graphic Art Direction

**Goal:** sleek, minimal, "cartoony" network equipment illustrations — UniFi-app-inspired
visual language that's instantly recognizable without being photorealistic.

## Non-negotiables

### Real proportions, always
1U = **19" × 1.75"** → **10.86:1** aspect ratio per U.

- ViewBox: `0 0 500 46` for 1U · `0 0 500 92` for 2U · `0 0 500 138` for 3U
- `preserveAspectRatio="xMidYMid meet"` — **never** `none`
- Container uses CSS `aspect-ratio: 500 / (46 * sizeU)` so it stays proportional at any width
- Legacy: 2.5rem-per-U fixed height is deprecated — stretches devices

### Layout grid (viewBox units, for 1U = 500×46)

| Region | Start X | End X | Y range |
|---|---|---|---|
| Left rack ear | 0 | 10 | 0-46 |
| LCD / brand panel | 14 | 80 | 4-42 |
| Ports region | 86 | 406 | 4-42 |
| SFP / uplinks | 410 | 486 | 10-36 |
| Right rack ear | 490 | 500 | 0-46 |

## Art style rules

### Chassis
- **Single subtle gradient** (top 2-3% lighter than body, bottom 3-4% darker).
  No more than 5% luminance range.
- Radius: `4` units (scales with viewBox)
- Rack ears: simpler — solid darker fill, **one** hole indicator centered (not 4)

### Ports (the hero element on switches)
- **NO** 48 tiny rectangles. Groups of 4–6 ports rendered as a single rounded
  rectangle (the "port cavity") with thin vertical dividers inside showing port count.
- Port cavity: fill `palette.cavity` (near-black), radius `1.5`
- Dividers: `0.5px` wide vertical lines, `rgba(255,255,255,0.08)`
- 2 LEDs per port group (one green "link", one amber/brand "activity") — not per port
- Small brand-colored stripe (0.6px) inset along top edge of cavity

### LCD / Status panel
- Prominent — **25–30% of chassis width** on switches, **larger** on UPS/servers
- Outer bezel: `palette.chassisDeep`, radius `2`
- Inner screen: `#0a1214` background with brand-color tint overlay at 12% opacity
- Content: 1-2 lines of brand-colored text, mono font, big enough to read at
  rendered size (≥ 5 viewBox units)

### Brand mark
- Prominent — not a tiny corner label
- Centered vertically in LCD area, or as a top accent stripe
- Typography-only (no real logos): abstracted wordmark in brand palette `brandText`
- Size: 8-11 units in 1U chassis, scales with chassis

### Brand accent stripe
- **Top edge** of chassis, 1 unit tall, `palette.primary` at 70% opacity
- This is the biggest visual brand signal — you instantly see "blue = UniFi" etc.

### SFP cages
- Deeper cavities than RJ45 (slightly wider aspect, deeper shadow)
- Inner tint in brand color at 50% opacity (hints at fiber/high-speed role)
- Small link LED at bottom-left of each cage

## Brand expression (confident, UniFi-inspired)

Each brand should have a **clear visual signature** at a glance:

- **Cisco** — cyan accent stripe, "cisco" wordmark in cyan, cyan LCD glow
- **Ubiquiti (UI)** — bold blue accent stripe (thicker than others), large "UI" mark,
  blue LCD glow. Ports fill with blue tint line.
- **Dell** — blue-on-dark, subtle "DELL" wordmark, mostly monochrome (Dell is minimalist)
- **HPE** — green accent stripe prominent, "HPE" mark in green
- **TrippLite** — red accent stripe is BOLD (red is brand's signature), big LCD
- **Juniper** — green accent like HPE but lime-tone
- **Generic / Custom** — subtle indigo, no wordmark, simpler chassis

## "Cartoony" = playful exaggeration
1. LCDs are ~1.3× the size they'd be IRL — more readable, more character
2. Ports render as BLOCKS, not individual jacks — friendlier, chunkier
3. Rounded corners EVERYWHERE — no hard angles
4. Brand marks are prominent like a sticker/badge, not a subtle etching
5. LED indicators are slightly oversized glowing dots
6. Subtle drop shadow under chassis for "floating" feel

## Per-device signature patterns

| Device | Hero element | Secondary | Distinguishing quirk |
|---|---|---|---|
| **Switch** | port-group blocks | LCD + brand | SFP cages on right |
| **Router** | LCD + few big ports | console port | antenna hints (if applicable) |
| **Firewall** | ports + colored accent bar | LCD | often has "FW" badge or red accent |
| **Server** | drive bay grid | control panel LCD | power button, vent grille |
| **UPS** | huge LCD with VA readout | battery bar | status LED row |
| **Patch panel** | dense port grid only | port numbering | no LCD, no brand |
| **PDU** | outlet circles | main breaker | amp meter display |
| **Storage** | drive bay grid (denser) | LCD | disk array indicators |
| **Other** | minimal chassis with brand tint | — | typography-focused |

## What to avoid
- ❌ Photorealism / drop-shadow overkill
- ❌ Manufacturer logos (copyright; also too detailed for our style)
- ❌ `preserveAspectRatio="none"` (stretches everything)
- ❌ Tiny details that only work at hero size
- ❌ Heavy gradients (more than 5% luminance range)
- ❌ Skeuomorphism (faux metal, faux leather, etc.)

## References

- UniFi Design Center (2D/3D transitions, clean flat blocks): https://blog.ui.com/article/all-new-unifi-design-center
- Linear design refresh (calmer interface, structure felt not seen): https://linear.app/now/behind-the-latest-design-refresh
- Real 19" rack dimensions: 19.00" × 1.75" per U = 10.857:1 aspect
