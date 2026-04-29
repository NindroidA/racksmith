# Device Graphic Art Direction (v2)

> **v2 direction (2026-04-28):** Per-model faithful-but-abstracted recreations.
> Visual differentiation across manufacturers is the primary goal; brand
> recognizability is a selling point. Tier-1 SKUs get their own component
> in `models/`; the type templates in `types/` remain as fallbacks.
>
> v1 was "sleek, minimal, cartoony — UniFi-app-inspired." Good for
> "recognizably a device", not good enough for "that's clearly a UDM-Pro."
> See `.plans/2026-04-24/02-device-graphic-v2-plan.md` for the full direction
> change rationale.

## v1 → v2 at a glance

| Aspect | v1 | v2 |
|---|---|---|
| Faithfulness | Stylized, abstract blocks | Per-model faithful layout |
| Port count | Grouped in 4–6 block sets | Actual count if legible, grouped if not |
| Brand signature | Small accent stripe + wordmark | Dominant per-model signatures (UDM-Pro LED ring, Cisco mode buttons, Dell drive bays) |
| Differentiation | Within-brand template-driven | Per-model SVG when warranted |
| Cartoony-ness | "Playful exaggeration" | Dial back — proportions match reality |
| Brand palette system | Keep | Keep (still the grounding layer) |
| Chassis primitives | Keep | Keep + extend |
| Type templates | 9 types (switch/router/etc.) | Keep as fallback; add per-model variants |

## Non-negotiables (carry over from v1)

### Real proportions, always
1U = **19" × 1.75"** → **10.86:1** aspect ratio per U.

- ViewBox: `0 0 500 46` for 1U · `0 0 500 92` for 2U · `0 0 500 138` for 3U
- `preserveAspectRatio="xMidYMid meet"` — **never** `none`
- Container uses CSS `aspect-ratio: 500 / (46 * sizeU)` so it stays
  proportional at any width

### Accessibility
- Every faceplate is wrapped in `<svg role="img">` with a meaningful
  `aria-label` (manufacturer + type/model + key spec like port count).
- `useReducedMotion()` is honored anywhere positional animation is
  introduced. Static SVG has no motion to disable, but per-model
  components that add transitions (e.g. LED pulse) MUST gate via the
  hook.

### Legal
- **No logos, ever.** Cisco's bridge logo, Dell's hex mark, HPE's green
  rectangle, Juniper's J-graph — none. Brand signal is via abstracted
  typography (`cisco` lowercase cyan, `UI` bold blue) already in
  `BRAND_PALETTES[brand].brandText`.
- **Reference images are inspiration, not templates.** Clean-room: a
  reviewer reads the product photo and writes prose; the author writes
  SVG from prose.
- Each per-model component MUST include a docstring citing the primary
  reference URL (UniFi store page, Cisco data sheet, Dell tech guide,
  etc.) plus a one-paragraph prose description of the layout. Future
  reviewers should be able to verify "inspired by, not copied" without
  the original photo in hand.

### Layout grid (1U = 500×46 viewBox units)

| Region | Start X | End X | Y range |
|---|---|---|---|
| Left rack ear | 0 | 10 | 0–46 |
| Brand panel / left signature | 14 | 80 | 4–42 |
| Ports region | 86 | 406 | 4–42 |
| SFP / uplinks / right signature | 410 | 486 | 10–36 |
| Right rack ear | 490 | 500 | 0–46 |

Per-model components MAY redistribute these regions (e.g. a Dell R750
makes the entire 14–490 region a drive bay grid with a thin LCD on the
far left). The grid is a starting point, not a hard constraint.

## v2 art rules — per-model

### Brand signature placement
The single most distinctive visual element of the real hardware should
dominate the layout, not be tucked into a corner. Examples:

| Model | Hero element | Where |
|---|---|---|
| UDM-Pro | LED status ring + 1.3" touchscreen | left-center, ~15% of chassis width |
| USW-Pro-48-PoE | 2×24 port grid + touchscreen | center-right + left |
| C9300-48P | stacked status LED column + 2×24 ports + modular uplink slot | far left + center + right third |
| Asa5506-X | left-side status LED column | far left, full height |
| R750 | 12×3.5" or 24×2.5" drive bay grid + amber LCD | full bezel + far-left LCD |
| SU1500RTXL2UA | 2-line LCD + status LED column + crimson accent | center-left + accent everywhere |

### Faithful proportions, abstracted detail
Match real device proportions for hero elements (drive-bay aspect, port
spacing, LCD aspect) but abstract sub-details:
- **Drive bays**: render the bay grid 1:1 in count, but skip the bay
  label etching, fan vents inside the bay, and per-bay clip indicators.
- **Ports**: 48-port switches show 48 dividers in the cavity (or 2×24)
  when legible at rack-slot scale (~60px). At smaller (~32px palette)
  scale, fall back to grouped blocks.
- **LCD readouts**: show plausible content (service tag, "iDRAC", "1500VA"),
  not the actual screen captures from product photos.

### Manufacturer signatures — quick reference

**Ubiquiti / UniFi** (Gen2+ design language)
- 1.3" color touchscreen on the front (always left side, square-ish)
- Tiny LED accent strip along the bottom (signature)
- "UI" bold wordmark in brand blue
- PoE ports get amber tint indicators; non-PoE neutral; SFP+ grouped right
- Near-black brushed aluminum chassis, matte, rounded corners

**Cisco** (Catalyst 9300 / 9200L / ASA 5506-X)
- Stacked status LED column on the far left (SYST/RPS/STAT/DUPLX/SPEED/STACK)
- Mode button below the LED stack
- 9300 has modular uplink slot on right third; 9200L doesn't
- "cisco" wordmark lowercase, cyan tone, near the LED column

**Dell PowerEdge** (R750 / R650)
- LCD control panel far-left bezel (amber-backlit)
- Drive bay grid as the hero — configurable rows × cols
- Power + USB + VGA cluster on the right bezel
- "DELL" wordmark on the right bezel, uppercase, subtle
- Truly near-black chassis, minimal bevels, industrial

**HPE / Aruba**
- Aruba CX switches: clean face, SFP+ row, smaller LED column on left,
  HPE green accent on top rack ear
- ProLiant servers: drive bay grid + horizontal LED bar across top of
  bays, iLO mgmt on right, HPE green rack-ear accent

**TrippLite / Eaton**
- 2-line LCD centered-left (~25% of chassis width), blue backlit
- Status LED column of 7 LEDs next to LCD
- Outlet access rear-mounted on rackmount (front shows LCD + LEDs +
  crimson accent only)
- "TRIPP·LITE" wordmark in red, right of LCD
- Slightly warmer near-black chassis (crimson palette tint)

**FS.com**
- Economy switches with utilitarian look — simple port rows, minimal LCD
- Small FS teal accent on top ear
- Often resembles a Cisco switch without the LED column

## Existing primitives (still in use)

In `primitives/`:
- `ChassisFrame` — base chassis with rack ears + accent stripe
- `PortGroup` — port-cavity block with thin dividers + LEDs
- `SfpCage` — deeper-cavity SFP+ slots
- `LcdPanel` — generic brand-tinted LCD readout
- `UnifiTouchscreen` — UniFi 1.3" touchscreen
- `CiscoStatusColumn` — Cisco SYST/RPS/STAT/DUPLX/SPEED/STACK column
- `BrandBadge` — small typography-only brand mark
- `PortNumbering` — tiny "1–6" / "7–12" labels above port groups
- `VentGrille` — chassis vent strip

## v2-new primitives (Phase A)

In `primitives/`:
- `LedStatusRing` — UDM-Pro thin segmented circle (brand-primary lit)
- `ModularUplinkSlot` — Cisco 9300 right-third dark rectangle (blank or
  4×SFP+ inset)
- `DriveBayGrid` — Dell / HPE configurable rows × cols of bay rectangles
  with drive handles + status LEDs
- `DellLcdPanel` — Dell PowerEdge amber-backlit narrow LCD

## Out of scope (still)

- Photorealism, traced art, pixel-sampled colors
- Manufacturer logos
- Real device photography
- Rear-view ports (separate v2.5c plan)
- 3D / isometric projection
- Animation on drag (existing drag-and-drop unchanged)
- Skeuomorphism (faux metal, etc.)

## References

- v2 plan: `.plans/2026-04-24/02-device-graphic-v2-plan.md` — full rationale,
  Tier 1/2/3 SKU breakdown, per-manufacturer reference URLs
- Real 19" rack dimensions: 19.00" × 1.75" per U = 10.857:1 aspect
