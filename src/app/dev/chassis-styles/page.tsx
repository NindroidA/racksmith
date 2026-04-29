import { notFound } from "next/navigation";

export const dynamic = "force-static";

/* -------------------------------------------------------------------------
 * Round 8 — final polish pass.
 *
 * Hero refinements:
 *   - NEMA 5-15R ground hole is now a sideways-D (flat top, curve below)
 *     so the outlet reads as a happy face — slots are the eyes, D is the
 *     smile. Distinct American 120V outlet look.
 *   - RJ45 jacks now show 8 individual gold contact pins along the top
 *     edge (the actual jack contacts) instead of a single strip.
 *   - SFP+ cages have a subtle internal depth gradient so the cavity
 *     reads as recessed rather than flat black.
 *   - LCDs get faint horizontal scanlines + cleaner typography.
 *   - UPS load bar is now a proper 10-segment LED bar graph.
 *   - Drive bay release lever has a metallic highlight strip.
 *   - LED bloom has a softer 4-stop halo.
 *   - Chassis gets a refined edge highlight + subtle bottom shadow strip.
 * ----------------------------------------------------------------------- */

/* ============================================================
 * 1. MAKE PALETTE — chassis hue/saturation per manufacturer
 * ============================================================ */
type Make = "ubiquiti" | "cisco" | "dell" | "tripplite" | "hpe" | "fs";

const MAKE_PALETTE: Record<
  Make,
  { hue: number; sat: number; accent: string; wordmark: string }
> = {
  ubiquiti: { hue: 213, sat: 14, accent: "#6a9de0", wordmark: "UI" },
  cisco: { hue: 195, sat: 12, accent: "#5ab4d4", wordmark: "cisco" },
  dell: { hue: 210, sat: 6, accent: "#6aa3c0", wordmark: "DELL" },
  tripplite: { hue: 8, sat: 8, accent: "#d04a4a", wordmark: "TL" },
  hpe: { hue: 160, sat: 6, accent: "#00b388", wordmark: "HPE" },
  fs: { hue: 188, sat: 5, accent: "#00adbc", wordmark: "FS" },
};

/* ============================================================
 * 2. MODEL LIGHTNESS — per device type within a make family
 * ============================================================ */
type Model =
  | "ap"
  | "ups"
  | "pdu"
  | "switch"
  | "poe-switch"
  | "gateway"
  | "firewall"
  | "server";

const MODEL_LIGHTNESS: Record<Model, number> = {
  ap: 91,
  ups: 86,
  pdu: 86,
  switch: 86,
  "poe-switch": 82,
  gateway: 78,
  firewall: 72,
  server: 67,
};

type ChassisColors = {
  base: string;
  hi: string;
  mid: string;
  lo: string;
  shadow: string;
  stroke: string;
};

function chassisColors(make: Make, model: Model): ChassisColors {
  const { hue, sat } = MAKE_PALETTE[make];
  const L = MODEL_LIGHTNESS[model];
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return {
    base: `hsl(${hue} ${sat}% ${L}%)`,
    hi: `hsl(${hue} ${Math.max(0, sat - 2)}% ${clamp(L + 7)}%)`,
    mid: `hsl(${hue} ${sat + 2}% ${clamp(L - 14)}%)`,
    lo: `hsl(${hue} ${sat + 4}% ${clamp(L - 22)}%)`,
    shadow: `hsl(${hue} ${sat + 6}% ${clamp(L - 32)}%)`,
    stroke: `hsl(${hue} ${sat + 4}% ${clamp(L - 38)}%)`,
  };
}

/* ============================================================
 * 3. SHARED COMPONENTS palette
 * ============================================================ */
const COMPONENTS = {
  cavity: "#1A1D22",
  cavityAlt: "#262A30",
  cavityRim: "#000000",
  cavityDeep: "#0a0c10",
  contactGold: "#caa258",
  contactGoldHi: "#e6c878",
  lcdBg: "#0E1115",
  lcdAmber: "#3a2a08",
  lcdAmberInk: "#f5b04f",
  lcdBlue: "#0a1c2c",
  lcdBlueInk: "#62b8e0",
  lcdScanline: "#ffffff",
  ledActive: "#5fd08b",
  ledWarn: "#f5b04f",
  ledDanger: "#ef4444",
  ledOff: "#3a3d44",
  outletGrip: "#444851",
  driveBay: "#1F232A",
  driveBayInner: "#15181d",
  metalHi: "#e9ecf2",
} as const;

/* ============================================================
 * Shared shape primitives — refined real-hardware geometry
 * ============================================================ */

/* Soft 4-stop LED bloom — outer halo, mid glow, soft core, hot core. */
function LedBloom({
  cx,
  cy,
  r,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
}) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r * 3.4} fill={color} opacity={0.07} />
      <circle cx={cx} cy={cy} r={r * 2.2} fill={color} opacity={0.18} />
      <circle cx={cx} cy={cy} r={r * 1.4} fill={color} opacity={0.4} />
      <circle cx={cx} cy={cy} r={r} fill={color} />
    </>
  );
}

/* RJ45 ethernet jack with individual gold contact pins (visible at
 * hero scale). 8 hairlines along the top edge for the real jack contacts. */
function EthPort({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const pinCount = 8;
  const pinAreaX = x + w * 0.22;
  const pinAreaW = w * 0.56;
  const pinW = pinAreaW / (pinCount * 1.6);
  const pinGap = (pinAreaW - pinCount * pinW) / (pinCount - 1);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={0.9}
        fill={COMPONENTS.cavityDeep}
      />
      <rect
        x={x + 0.35}
        y={y + 0.35}
        width={w - 0.7}
        height={h - 0.7}
        rx={0.7}
        fill={COMPONENTS.cavity}
      />
      <rect
        x={x + 0.5}
        y={y + 0.4}
        width={w - 1}
        height={0.4}
        rx={0.2}
        fill="#000"
        opacity={0.7}
      />
      {/* gold contact strip backing */}
      <rect
        x={pinAreaX}
        y={y + 0.95}
        width={pinAreaW}
        height={0.5}
        rx={0.1}
        fill={COMPONENTS.contactGold}
        opacity={0.4}
      />
      {/* 8 individual contact pins */}
      {Array.from({ length: pinCount }).map((_, i) => (
        <rect
          key={i}
          x={pinAreaX + i * (pinW + pinGap)}
          y={y + 0.85}
          width={pinW}
          height={1.0}
          fill={COMPONENTS.contactGoldHi}
          opacity={0.85}
        />
      ))}
      {/* trapezoidal clip notch at top center */}
      <path
        d={`M ${x + w * 0.42},${y + 0.4} L ${x + w * 0.5},${y + 0.05} L ${x + w * 0.58},${y + 0.4} Z`}
        fill={COMPONENTS.cavityAlt}
      />
      {/* subtle inner side-shadow on the cage walls */}
      <rect
        x={x + 0.35}
        y={y + 0.35}
        width={0.4}
        height={h - 0.7}
        fill="#000"
        opacity={0.35}
      />
      <rect
        x={x + w - 0.75}
        y={y + 0.35}
        width={0.4}
        height={h - 0.7}
        fill="#000"
        opacity={0.35}
      />
    </g>
  );
}

/* SFP+ cage with mounting flanges, retention spring, and an internal
 * depth gradient (stacked translucent rects) so the cavity reads as
 * recessed rather than flat black. */
function SfpCage({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={0.6}
        fill={COMPONENTS.cavityDeep}
      />
      <rect
        x={x + 0.3}
        y={y + 0.3}
        width={w - 0.6}
        height={h - 0.6}
        rx={0.4}
        fill={COMPONENTS.cavity}
      />
      {/* internal depth — fade to lighter at the bottom (recessed feel) */}
      <rect
        x={x + 0.3}
        y={y + h * 0.5}
        width={w - 0.6}
        height={h * 0.5 - 0.3}
        rx={0.4}
        fill={COMPONENTS.cavityAlt}
        opacity={0.7}
      />
      <rect
        x={x + 0.5}
        y={y + 0.4}
        width={w - 1}
        height={0.5}
        fill="#000"
        opacity={0.85}
      />
      {/* mounting flanges */}
      <rect
        x={x - 0.2}
        y={y + h * 0.35}
        width={0.5}
        height={h * 0.3}
        fill={COMPONENTS.cavityAlt}
      />
      <rect
        x={x + w - 0.3}
        y={y + h * 0.35}
        width={0.5}
        height={h * 0.3}
        fill={COMPONENTS.cavityAlt}
      />
      {/* retention spring at top (visible at hero scale) */}
      <rect
        x={x + w * 0.28}
        y={y + h * 0.16}
        width={w * 0.44}
        height={0.4}
        fill="#3a3f47"
        opacity={0.7}
      />
      <rect
        x={x + w * 0.28}
        y={y + h * 0.22}
        width={w * 0.44}
        height={0.2}
        fill={COMPONENTS.metalHi}
        opacity={0.15}
      />
      {/* subtle side-wall shadows */}
      <rect
        x={x + 0.3}
        y={y + 0.3}
        width={0.35}
        height={h - 0.6}
        fill="#000"
        opacity={0.4}
      />
      <rect
        x={x + w - 0.65}
        y={y + 0.3}
        width={0.35}
        height={h - 0.6}
        fill="#000"
        opacity={0.4}
      />
    </g>
  );
}

/* NEMA 5-15R outlet — proper "happy face" geometry:
 * - Two vertical slots (eyes) — neutral on left taller, hot on right
 *   shorter
 * - D-shape ground hole below (flat top, curve down — the "smile")
 * - Recessed inner face inside an outer rounded bezel
 * Distinct American 120V plug look. */
function NemaOutlet({
  cx,
  cy,
  size,
  c,
  active,
}: {
  cx: number;
  cy: number;
  size: number;
  c: ChassisColors;
  active?: boolean;
}) {
  const w = size;
  const h = size * 1.05;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const slotW = w * 0.075;
  const slotH = h * 0.26;
  const slotGap = w * 0.18;
  const slotsCenterY = y + h * 0.34;
  // Smile-D ground geometry — taller than wide so the mouth doesn't read squished
  const groundCx = cx;
  const groundCy = y + h * 0.62; // flat top of the D sits here
  const groundRx = w * 0.1;
  const groundRy = w * 0.17;
  return (
    <g>
      {/* outer bezel — rounded square that sits proud of the chassis */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={w * 0.28}
        fill={c.mid}
        stroke={c.stroke}
        strokeWidth={0.35}
      />
      {/* faint top highlight on bezel */}
      <rect
        x={x + w * 0.2}
        y={y + 0.15}
        width={w * 0.6}
        height={0.5}
        rx={w * 0.2}
        fill={COMPONENTS.metalHi}
        opacity={0.18}
      />
      {/* recessed inner face */}
      <rect
        x={x + w * 0.12}
        y={y + h * 0.1}
        width={w * 0.76}
        height={h * 0.8}
        rx={w * 0.2}
        fill={c.lo}
      />
      {/* inner top recess shadow (sells depth) */}
      <rect
        x={x + w * 0.12}
        y={y + h * 0.1}
        width={w * 0.76}
        height={0.5}
        rx={w * 0.2}
        fill="#000"
        opacity={0.3}
      />
      {/* neutral slot (left, taller and slightly wider — eye 1) */}
      <rect
        x={cx - slotGap / 2 - slotW * 1.05}
        y={slotsCenterY - slotH / 2 - 0.25}
        width={slotW * 1.1}
        height={slotH + 0.5}
        rx={slotW * 0.3}
        fill={COMPONENTS.cavity}
      />
      {/* tiny inner highlight on slot bottom (suggests depth) */}
      <rect
        x={cx - slotGap / 2 - slotW * 1.05 + 0.1}
        y={slotsCenterY + slotH / 2 + 0.05}
        width={slotW * 0.9}
        height={0.15}
        fill={COMPONENTS.metalHi}
        opacity={0.25}
      />
      {/* hot slot (right, shorter — eye 2) */}
      <rect
        x={cx + slotGap / 2}
        y={slotsCenterY - slotH / 2}
        width={slotW}
        height={slotH}
        rx={slotW * 0.3}
        fill={COMPONENTS.cavity}
      />
      <rect
        x={cx + slotGap / 2 + 0.1}
        y={slotsCenterY + slotH / 2 - 0.2}
        width={slotW * 0.8}
        height={0.15}
        fill={COMPONENTS.metalHi}
        opacity={0.25}
      />
      {/* GROUND — sideways D / smile shape (flat top, curve below) */}
      <path
        d={`M ${groundCx - groundRx},${groundCy} L ${groundCx + groundRx},${groundCy} A ${groundRx},${groundRy} 0 0 1 ${groundCx - groundRx},${groundCy} Z`}
        fill={COMPONENTS.cavity}
      />
      {/* tiny highlight along the flat top of the D (sells the smile) */}
      <rect
        x={groundCx - groundRx * 0.85}
        y={groundCy - 0.05}
        width={groundRx * 1.7}
        height={0.18}
        fill={COMPONENTS.metalHi}
        opacity={0.22}
      />
      {/* per-outlet status LED above the slots (between bezel top and slots) */}
      <circle
        cx={cx}
        cy={y + h * 0.16}
        r={0.4}
        fill={active === false ? COMPONENTS.ledOff : COMPONENTS.ledActive}
        opacity={0.95}
      />
    </g>
  );
}

/* 2.5" hot-swap drive bay with recessed carrier face, status LEDs,
 * and a metallic release lever. */
function DriveBay({
  x,
  y,
  w,
  h,
  c,
  active,
  status,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  c: ChassisColors;
  active: boolean;
  status: "ok" | "fault" | "warn" | "off";
}) {
  const statusColor =
    status === "fault"
      ? COMPONENTS.ledDanger
      : status === "warn"
        ? COMPONENTS.ledWarn
        : status === "off"
          ? COMPONENTS.ledOff
          : COMPONENTS.ledActive;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={0.8}
        fill={COMPONENTS.driveBay}
        stroke={c.stroke}
        strokeWidth={0.3}
      />
      <rect
        x={x + 0.3}
        y={y + 0.3}
        width={w - 0.6}
        height={h - 0.6}
        rx={0.5}
        fill={COMPONENTS.driveBayInner}
      />
      <rect
        x={x + 0.4}
        y={y + 0.4}
        width={w - 0.8}
        height={0.5}
        fill="#000"
        opacity={0.6}
      />
      {/* very subtle vertical highlight on the carrier face (metal feel) */}
      <rect
        x={x + 0.5}
        y={y + 0.5}
        width={0.3}
        height={h - 1}
        fill={COMPONENTS.metalHi}
        opacity={0.04}
      />
      {/* activity LED (left) + status LED (right) at top with bloom */}
      <LedBloom
        cx={x + w * 0.32}
        cy={y + 2}
        r={0.42}
        color={active ? COMPONENTS.ledActive : COMPONENTS.ledOff}
      />
      <LedBloom cx={x + w * 0.68} cy={y + 2} r={0.42} color={statusColor} />
      {/* release lever — chunky base + metallic highlight stripe */}
      <rect
        x={x + 0.6}
        y={y + h * 0.45}
        width={1.6}
        height={h * 0.1}
        rx={0.3}
        fill={c.mid}
        stroke={c.stroke}
        strokeWidth={0.3}
      />
      <rect
        x={x + 0.7}
        y={y + h * 0.46}
        width={1.4}
        height={h * 0.025}
        rx={0.1}
        fill={COMPONENTS.metalHi}
        opacity={0.45}
      />
      {/* lever pull-tab handle */}
      <rect
        x={x + 0.85}
        y={y + h * 0.485}
        width={1.1}
        height={h * 0.05}
        rx={0.18}
        fill={c.lo}
      />
      {/* form-factor etching at bottom */}
      <text
        x={x + w * 0.5}
        y={y + h - 1.5}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={2.4}
        fill={c.mid}
        opacity={0.45}
      >
        2.5″
      </text>
    </g>
  );
}

/* Faint LCD scanline overlay — subtle horizontal lines for that
 * "real screen" feel. Renders 4-6 thin lines depending on LCD size. */
function LcdScanlines({
  x,
  y,
  w,
  h,
  ink = COMPONENTS.lcdScanline,
  opacity = 0.04,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  ink?: string;
  opacity?: number;
}) {
  const lines = Math.max(3, Math.floor(h * 0.6));
  return (
    <>
      {Array.from({ length: lines }).map((_, i) => (
        <rect
          key={i}
          x={x}
          y={y + ((i + 0.5) * h) / lines}
          width={w}
          height={0.18}
          fill={ink}
          opacity={opacity}
        />
      ))}
    </>
  );
}

/* 10-segment LED bar graph (UPS load indicator). Lit segments are
 * green up to ~75%, amber 75-90%, red 90+. */
function LedBarGraph({
  x,
  y,
  w,
  h,
  segments,
  pct,
  c,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  segments: number;
  pct: number;
  c: ChassisColors;
}) {
  const gap = 0.6;
  const segW = (w - gap * (segments - 1)) / segments;
  const litCount = Math.floor((pct / 100) * segments);
  return (
    <>
      {/* recessed track */}
      <rect
        x={x - 0.6}
        y={y - 0.6}
        width={w + 1.2}
        height={h + 1.2}
        rx={1.2}
        fill={c.lo}
      />
      {Array.from({ length: segments }).map((_, i) => {
        const sx = x + i * (segW + gap);
        const isLit = i < litCount;
        const color = isLit
          ? i < segments * 0.75
            ? COMPONENTS.ledActive
            : i < segments * 0.9
              ? COMPONENTS.ledWarn
              : COMPONENTS.ledDanger
          : COMPONENTS.ledOff;
        return (
          <g key={i}>
            <rect
              x={sx}
              y={y}
              width={segW}
              height={h}
              rx={0.4}
              fill="#000"
              opacity={0.7}
            />
            <rect
              x={sx + 0.2}
              y={y + 0.2}
              width={segW - 0.4}
              height={h - 0.4}
              rx={0.3}
              fill={color}
              opacity={isLit ? 1 : 0.55}
            />
            {isLit ? (
              <rect
                x={sx + 0.4}
                y={y + 0.4}
                width={segW - 0.8}
                height={0.3}
                fill="#fff"
                opacity={0.45}
              />
            ) : null}
          </g>
        );
      })}
    </>
  );
}

/* Chassis frame — drop shadow + body + refined top highlight + soft
 * bottom shadow strip. Adds subtle dimensionality. */
function ChassisFrame({
  x,
  y,
  w,
  h,
  c,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  c: ChassisColors;
}) {
  return (
    <g>
      {/* drop shadow */}
      <rect
        x={x + 0.5}
        y={y + 1.6}
        width={w}
        height={h}
        rx={4}
        fill={c.shadow}
        opacity={0.55}
      />
      {/* main body */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill={c.base}
        stroke={c.stroke}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      {/* inner top highlight (metallic edge) */}
      <rect
        x={x + 1.2}
        y={y + 0.6}
        width={w - 2.4}
        height={0.7}
        rx={2}
        fill={c.hi}
        opacity={0.95}
      />
      {/* very faint pinstripe highlight just below */}
      <rect
        x={x + 1.6}
        y={y + 1.5}
        width={w - 3.2}
        height={0.22}
        rx={1}
        fill={COMPONENTS.metalHi}
        opacity={0.18}
      />
      {/* soft bottom shadow strip */}
      <rect
        x={x + 1.6}
        y={y + h - 1.6}
        width={w - 3.2}
        height={0.7}
        rx={1}
        fill={c.shadow}
        opacity={0.4}
      />
    </g>
  );
}

/* Rack-ear mounting hole with a tiny highlight spec for 3D feel. */
function RackEarHole({
  cx,
  cy,
  c,
}: {
  cx: number;
  cy: number;
  c: ChassisColors;
}) {
  return (
    <>
      <circle cx={cx} cy={cy} r={1.2} fill={c.lo} />
      <circle cx={cx} cy={cy} r={0.55} fill={c.stroke} />
      <circle
        cx={cx - 0.3}
        cy={cy - 0.3}
        r={0.18}
        fill={COMPONENTS.metalHi}
        opacity={0.5}
      />
    </>
  );
}

/* ============================================================
 * 4. DEVICE RENDERERS
 * ============================================================ */
type Ctx = {
  c: ChassisColors;
  accent: string;
  wordmark: string;
  w: number;
  h: number;
};

/* === UniFi UDM-Pro — gateway (1U) ============================== */
function RenderUdmPro({ c, accent, wordmark, w, h }: Ctx) {
  const ear = 8;
  const bodyX = ear;
  const bodyW = w - ear * 2;
  const screenR = h * 0.32;
  const screenCx = bodyX + 8 + screenR;
  const screenCy = h / 2;
  const portsX = screenCx + screenR + 8;
  const wanW = h * 0.55;
  const lanX = portsX + wanW + 5;
  const portCount = 8;
  const lanW = (bodyW - (lanX - bodyX) - 80) / portCount;
  const sfpX = lanX + portCount * lanW + 4;
  const sfpW = 50;
  const sfpY = h * 0.28;
  const sfpH = h * 0.44;
  return (
    <g>
      <ChassisFrame x={bodyX} y={0} w={bodyW} h={h} c={c} />

      {/* round touchscreen with brand halo */}
      <circle
        cx={screenCx}
        cy={screenCy}
        r={screenR + 1.6}
        fill={accent}
        opacity={0.18}
      />
      <circle
        cx={screenCx}
        cy={screenCy}
        r={screenR + 0.9}
        fill={accent}
        opacity={0.28}
      />
      <circle cx={screenCx} cy={screenCy} r={screenR + 0.6} fill={c.lo} />
      <circle cx={screenCx} cy={screenCy} r={screenR} fill={COMPONENTS.lcdBg} />
      {/* faint screen scanlines */}
      <LcdScanlines
        x={screenCx - screenR}
        y={screenCy - screenR}
        w={screenR * 2}
        h={screenR * 2}
        opacity={0.05}
      />
      {/* status dot top-right */}
      <LedBloom
        cx={screenCx + screenR * 0.6}
        cy={screenCy - screenR * 0.55}
        r={0.5}
        color={COMPONENTS.ledActive}
      />
      <text
        x={screenCx}
        y={screenCy + 0.2}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={9}
        fontWeight={700}
        fill={accent}
        letterSpacing="0.04em"
      >
        {wordmark}
      </text>
      <text
        x={screenCx}
        y={screenCy + 5.5}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={3}
        fill={accent}
        opacity={0.7}
        letterSpacing="0.1em"
      >
        ONLINE
      </text>

      {/* WAN port with brand-color rim */}
      <text
        x={portsX + wanW / 2}
        y={h * 0.18}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={3.5}
        fill={c.stroke}
        letterSpacing="0.1em"
      >
        WAN
      </text>
      <rect
        x={portsX - 0.7}
        y={h * 0.26}
        width={wanW + 1.4}
        height={h * 0.5}
        rx={1.6}
        fill={accent}
        opacity={0.45}
      />
      <EthPort x={portsX} y={h * 0.28} w={wanW} h={h * 0.46} />
      <LedBloom cx={portsX + wanW / 2} cy={h * 0.84} r={0.55} color={accent} />

      {/* 8 LAN ports */}
      <text
        x={lanX + (lanW * portCount) / 2}
        y={h * 0.18}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={3.5}
        fill={c.stroke}
        letterSpacing="0.1em"
      >
        LAN
      </text>
      {Array.from({ length: portCount }).map((_, i) => {
        const px = lanX + i * lanW + 0.4;
        const lit = i % 4 !== 3;
        return (
          <g key={i}>
            <EthPort x={px} y={h * 0.28} w={lanW - 0.8} h={h * 0.46} />
            <LedBloom
              cx={px + (lanW - 0.8) / 2}
              cy={h * 0.84}
              r={0.42}
              color={lit ? COMPONENTS.ledActive : COMPONENTS.ledOff}
            />
          </g>
        );
      })}

      {/* 2 SFP+ uplinks */}
      <text
        x={sfpX + sfpW / 2}
        y={h * 0.18}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={3.5}
        fill={c.stroke}
        letterSpacing="0.1em"
      >
        SFP+
      </text>
      <rect
        x={sfpX - 0.9}
        y={sfpY - 0.9}
        width={sfpW + 1.8}
        height={sfpH + 1.8}
        rx={1.5}
        fill={c.lo}
      />
      {Array.from({ length: 2 }).map((_, i) => {
        const slotW = (sfpW - 4) / 2;
        return (
          <SfpCage
            key={i}
            x={sfpX + 1 + i * (slotW + 2)}
            y={sfpY}
            w={slotW}
            h={sfpH}
          />
        );
      })}

      <LedBloom
        cx={w - ear - 4}
        cy={h * 0.5}
        r={1.2}
        color={COMPONENTS.ledActive}
      />
      <RackEarHole cx={ear / 2} cy={h * 0.28} c={c} />
      <RackEarHole cx={ear / 2} cy={h * 0.72} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.28} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.72} c={c} />
    </g>
  );
}

/* === UniFi USW-Pro-48-PoE — PoE switch (1U) ===================== */
function RenderUswPro48({ c, accent, wordmark, w, h }: Ctx) {
  const ear = 8;
  const bodyX = ear;
  const bodyW = w - ear * 2;
  const lcdX = bodyX + 5;
  const lcdY = h * 0.18;
  const lcdW = h * 0.95;
  const lcdH = h * 0.64;
  const portsX = lcdX + lcdW + 6;
  const portsW = bodyW - (portsX - bodyX) - 70;
  const cols = 12;
  const rows = 2;
  const groupCount = 3;
  const groupGap = portsW * 0.02;
  const groupW = (portsW - groupGap * (groupCount - 1)) / groupCount;
  const portW = groupW / 4;
  const portH = (h * 0.46) / rows - 0.5;
  const sfpX = portsX + portsW + 4;
  const sfpW = 56;
  const sfpY = h * 0.28;
  const sfpH = h * 0.44;
  return (
    <g>
      <ChassisFrame x={bodyX} y={0} w={bodyW} h={h} c={c} />

      {/* LCD bezel + screen */}
      <rect
        x={lcdX - 0.7}
        y={lcdY - 0.7}
        width={lcdW + 1.4}
        height={lcdH + 1.4}
        rx={1.7}
        fill={c.lo}
      />
      <rect
        x={lcdX}
        y={lcdY}
        width={lcdW}
        height={lcdH}
        rx={1.4}
        fill={COMPONENTS.lcdBg}
      />
      <LcdScanlines x={lcdX} y={lcdY} w={lcdW} h={lcdH} />
      <text
        x={lcdX + lcdW / 2}
        y={lcdY + lcdH * 0.5}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={8}
        fontWeight={700}
        fill={accent}
        letterSpacing="0.05em"
      >
        {wordmark}
      </text>
      <text
        x={lcdX + lcdW / 2}
        y={lcdY + lcdH * 0.8}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={3.6}
        fill="#fff"
        opacity={0.7}
        letterSpacing="0.05em"
      >
        48-PoE
      </text>

      {/* port array — 2 rows of 12 */}
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((__, ci) => {
          const groupIdx = Math.floor(ci / 4);
          const inGroupIdx = ci % 4;
          const px =
            portsX + groupIdx * (groupW + groupGap) + inGroupIdx * portW + 0.2;
          const py = h * 0.18 + ri * (portH + 1.6);
          const portIdx = ri * cols + ci;
          const lit = portIdx % 5 !== 4;
          return (
            <g key={`${ri}-${ci}`}>
              <LedBloom
                cx={px + (portW - 0.4) / 2}
                cy={py - 1.4}
                r={0.4}
                color={lit ? COMPONENTS.ledWarn : COMPONENTS.ledOff}
              />
              <EthPort x={px} y={py} w={portW - 0.4} h={portH} />
            </g>
          );
        }),
      )}

      {/* 4 SFP+ */}
      <rect
        x={sfpX - 0.9}
        y={sfpY - 0.9}
        width={sfpW + 1.8}
        height={sfpH + 1.8}
        rx={1.5}
        fill={c.lo}
      />
      {Array.from({ length: 4 }).map((_, i) => {
        const slotW = (sfpW - 6) / 4;
        return (
          <SfpCage
            key={i}
            x={sfpX + 1 + i * (slotW + 1)}
            y={sfpY}
            w={slotW}
            h={sfpH}
          />
        );
      })}

      <LedBloom
        cx={w - ear - 4}
        cy={h * 0.5}
        r={1}
        color={COMPONENTS.ledActive}
      />
      <RackEarHole cx={ear / 2} cy={h * 0.28} c={c} />
      <RackEarHole cx={ear / 2} cy={h * 0.72} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.28} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.72} c={c} />
    </g>
  );
}

/* === Cisco Catalyst 9300-48P — managed switch (1U) ============== */
function RenderC9300({ c, accent, wordmark, w, h }: Ctx) {
  const ear = 8;
  const bodyX = ear;
  const bodyW = w - ear * 2;
  const colX = bodyX + 4;
  const colYTop = h * 0.14;
  const colYBot = h * 0.6;
  const labels = ["SYST", "RPS", "STAT", "DUPLX", "SPEED"];
  const ledColors = [
    COMPONENTS.ledActive,
    COMPONENTS.ledOff,
    COMPONENTS.ledActive,
    COMPONENTS.ledWarn,
    COMPONENTS.ledActive,
  ];
  const modeCx = colX;
  const modeCy = h * 0.78;
  const wordX = bodyX + 22;
  const portsX = bodyX + 52;
  const uplinkW = h * 1.05;
  const portsW = bodyW - (portsX - bodyX) - uplinkW - 8;
  const cols = 24;
  const rows = 2;
  const groupCount = 6;
  const groupGap = portsW * 0.012;
  const groupW = (portsW - groupGap * (groupCount - 1)) / groupCount;
  const portW = groupW / 4;
  const portH = (h * 0.5) / rows - 0.4;
  const uplinkX = portsX + portsW + 6;
  return (
    <g>
      <ChassisFrame x={bodyX} y={0} w={bodyW} h={h} c={c} />

      {/* status LED column with tight spacing + labels */}
      {labels.map((label, i) => {
        const cy = colYTop + (i + 0.5) * ((colYBot - colYTop) / labels.length);
        return (
          <g key={label}>
            <LedBloom
              cx={colX}
              cy={cy}
              r={0.5}
              color={ledColors[i] ?? COMPONENTS.ledOff}
            />
            <text
              x={colX + 2.4}
              y={cy + 1.1}
              fontFamily="ui-monospace, monospace"
              fontSize={2.6}
              fontWeight={500}
              fill={c.stroke}
            >
              {label}
            </text>
          </g>
        );
      })}
      {/* round MODE button — chunky base + dome highlight */}
      <circle cx={modeCx} cy={modeCy} r={1.5} fill={c.stroke} opacity={0.4} />
      <circle
        cx={modeCx}
        cy={modeCy}
        r={1.3}
        fill={c.lo}
        stroke={c.stroke}
        strokeWidth={0.4}
      />
      <circle cx={modeCx} cy={modeCy} r={0.65} fill={c.mid} />
      <circle
        cx={modeCx - 0.25}
        cy={modeCy - 0.25}
        r={0.25}
        fill={COMPONENTS.metalHi}
        opacity={0.4}
      />
      <text
        x={modeCx + 2.4}
        y={modeCy + 1}
        fontFamily="ui-monospace, monospace"
        fontSize={2.4}
        fill={c.stroke}
      >
        MODE
      </text>

      {/* "cisco" wordmark */}
      <text
        x={wordX}
        y={h * 0.5 + 2}
        fontFamily="ui-monospace, monospace"
        fontSize={5.5}
        fontWeight={600}
        fill={accent}
        letterSpacing="0.04em"
      >
        {wordmark}
      </text>

      {/* port array 2×24 */}
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((__, ci) => {
          const groupIdx = Math.floor(ci / 4);
          const inGroupIdx = ci % 4;
          const px =
            portsX + groupIdx * (groupW + groupGap) + inGroupIdx * portW + 0.15;
          const py = h * 0.18 + ri * (portH + 1.4);
          const portIdx = ri * cols + ci;
          const lit = portIdx % 6 !== 5;
          const amber = portIdx % 11 === 0;
          return (
            <g key={`${ri}-${ci}`}>
              <LedBloom
                cx={px + (portW - 0.3) / 2}
                cy={py - 1.2}
                r={0.32}
                color={
                  !lit
                    ? COMPONENTS.ledOff
                    : amber
                      ? COMPONENTS.ledWarn
                      : COMPONENTS.ledActive
                }
              />
              <EthPort x={px} y={py} w={portW - 0.3} h={portH} />
            </g>
          );
        }),
      )}

      {/* modular uplink slot */}
      <rect
        x={uplinkX - 0.9}
        y={h * 0.16}
        width={uplinkW + 1.8}
        height={h * 0.7}
        rx={1.5}
        fill={c.lo}
      />
      <rect
        x={uplinkX}
        y={h * 0.18}
        width={uplinkW}
        height={h * 0.66}
        rx={1.2}
        fill={COMPONENTS.cavityDeep}
      />
      <text
        x={uplinkX + uplinkW / 2}
        y={h * 0.16 - 0.5}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={2.4}
        fill={c.stroke}
      >
        UPLINK
      </text>
      {Array.from({ length: 4 }).map((_, i) => {
        const slotW = (uplinkW - 8) / 4;
        return (
          <SfpCage
            key={i}
            x={uplinkX + 2 + i * (slotW + 1.5)}
            y={h * 0.27}
            w={slotW}
            h={h * 0.48}
          />
        );
      })}

      <LedBloom
        cx={w - ear - 4}
        cy={h * 0.5}
        r={1}
        color={COMPONENTS.ledActive}
      />
      <RackEarHole cx={ear / 2} cy={h * 0.28} c={c} />
      <RackEarHole cx={ear / 2} cy={h * 0.72} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.28} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.72} c={c} />
    </g>
  );
}

/* === Dell PowerEdge R750 — 1U server with drive bays ============ */
function RenderR750({ c, wordmark, w, h }: Ctx) {
  const ear = 8;
  const bodyX = ear;
  const bodyW = w - ear * 2;
  const lcdX = bodyX + 5;
  const lcdW = h * 1.0;
  const lcdY = h * 0.22;
  const lcdH = h * 0.56;
  const baysX = lcdX + lcdW + 6;
  const usbW = h * 0.7;
  const usbX = bodyX + bodyW - usbW - 6;
  const baysW = usbX - baysX - 4;
  const bays = 8;
  const bayW = (baysW - 7 * 0.6) / bays;
  const bayY = h * 0.1;
  const bayH = h * 0.8;
  const statusPattern: Array<"ok" | "fault" | "warn" | "off"> = [
    "ok",
    "ok",
    "ok",
    "ok",
    "ok",
    "fault",
    "ok",
    "ok",
  ];
  return (
    <g>
      <ChassisFrame x={bodyX} y={0} w={bodyW} h={h} c={c} />

      {/* amber-backlit Dell LCD */}
      <rect
        x={lcdX - 0.7}
        y={lcdY - 0.7}
        width={lcdW + 1.4}
        height={lcdH + 1.4}
        rx={1.7}
        fill={c.lo}
      />
      <rect
        x={lcdX}
        y={lcdY}
        width={lcdW}
        height={lcdH}
        rx={1.4}
        fill={COMPONENTS.lcdAmber}
      />
      <LcdScanlines
        x={lcdX}
        y={lcdY}
        w={lcdW}
        h={lcdH}
        ink={COMPONENTS.lcdAmberInk}
        opacity={0.06}
      />
      <text
        x={lcdX + lcdW / 2}
        y={lcdY + lcdH * 0.5}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={6.5}
        fontWeight={800}
        fill={COMPONENTS.lcdAmberInk}
        letterSpacing="0.05em"
      >
        iDRAC
      </text>
      <text
        x={lcdX + lcdW / 2}
        y={lcdY + lcdH * 0.84}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={3.4}
        fill={COMPONENTS.lcdAmberInk}
        opacity={0.85}
        letterSpacing="0.1em"
      >
        7H4XK2L
      </text>

      {/* 8 drive bays */}
      {Array.from({ length: bays }).map((_, i) => {
        const bx = baysX + i * (bayW + 0.6);
        const status = statusPattern[i] ?? "ok";
        return (
          <DriveBay
            key={i}
            x={bx}
            y={bayY}
            w={bayW}
            h={bayH}
            c={c}
            active={status !== "off"}
            status={status}
          />
        );
      })}

      {/* USB ports + power button + DELL wordmark */}
      <rect
        x={usbX}
        y={h * 0.18}
        width={usbW}
        height={h * 0.16}
        rx={0.6}
        fill={COMPONENTS.cavity}
      />
      <rect
        x={usbX + 1}
        y={h * 0.21}
        width={usbW - 2}
        height={h * 0.04}
        fill="#3a3f47"
        opacity={0.5}
      />
      <text
        x={usbX + usbW / 2}
        y={h * 0.34}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={2.4}
        fill={c.stroke}
        opacity={0.8}
      >
        USB
      </text>
      <rect
        x={usbX}
        y={h * 0.42}
        width={usbW}
        height={h * 0.16}
        rx={0.6}
        fill={COMPONENTS.cavity}
      />
      <rect
        x={usbX + 1}
        y={h * 0.45}
        width={usbW - 2}
        height={h * 0.04}
        fill="#3a3f47"
        opacity={0.5}
      />
      {/* power button — domed */}
      <circle
        cx={usbX + usbW / 2}
        cy={h * 0.74}
        r={2}
        fill={c.stroke}
        opacity={0.4}
      />
      <circle
        cx={usbX + usbW / 2}
        cy={h * 0.74}
        r={1.8}
        fill={c.lo}
        stroke={c.stroke}
        strokeWidth={0.4}
      />
      <LedBloom
        cx={usbX + usbW / 2}
        cy={h * 0.74}
        r={0.7}
        color={COMPONENTS.ledActive}
      />
      <text
        x={usbX + usbW / 2}
        y={h * 0.96}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={3.4}
        fontWeight={700}
        fill={c.stroke}
        letterSpacing="0.22em"
      >
        {wordmark}
      </text>

      <RackEarHole cx={ear / 2} cy={h * 0.28} c={c} />
      <RackEarHole cx={ear / 2} cy={h * 0.72} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.28} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.72} c={c} />
    </g>
  );
}

/* === TrippLite PDUMH20-NET — rackmount PDU (1U) ================= */
function RenderPdu({ c, accent, w, h }: Ctx) {
  const ear = 8;
  const bodyX = ear;
  const bodyW = w - ear * 2;
  const lcdX = bodyX + 5;
  const lcdY = h * 0.22;
  const lcdW = h * 1.05;
  const lcdH = h * 0.56;
  const breakerW = h * 0.5;
  const breakerX = bodyX + bodyW - breakerW - 5;
  const outletsX = lcdX + lcdW + 18;
  const outletsW = breakerX - outletsX - 4;
  const outlets = 8;
  const outletGap = 1.2;
  const outletSize = (outletsW - (outlets - 1) * outletGap) / outlets;
  const outletCy = h * 0.5;
  const offlineIdx = 5;
  return (
    <g>
      <ChassisFrame x={bodyX} y={0} w={bodyW} h={h} c={c} />

      {/* crimson accent rail along the top */}
      <rect
        x={bodyX + 4}
        y={h * 0.06}
        width={bodyW - 8}
        height={0.6}
        rx={0.3}
        fill={accent}
        opacity={0.95}
      />
      {/* tiny highlight on rail (specular) */}
      <rect
        x={bodyX + 5}
        y={h * 0.06}
        width={bodyW - 10}
        height={0.18}
        rx={0.1}
        fill={COMPONENTS.metalHi}
        opacity={0.35}
      />

      {/* LCD wattage display */}
      <rect
        x={lcdX - 0.7}
        y={lcdY - 0.7}
        width={lcdW + 1.4}
        height={lcdH + 1.4}
        rx={1.7}
        fill={c.lo}
      />
      <rect
        x={lcdX}
        y={lcdY}
        width={lcdW}
        height={lcdH}
        rx={1.4}
        fill={COMPONENTS.lcdBlue}
      />
      <LcdScanlines
        x={lcdX}
        y={lcdY}
        w={lcdW}
        h={lcdH}
        ink={COMPONENTS.lcdBlueInk}
        opacity={0.06}
      />
      <text
        x={lcdX + lcdW / 2}
        y={lcdY + lcdH * 0.52}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={9.5}
        fontWeight={800}
        fill={COMPONENTS.lcdBlueInk}
        letterSpacing="0.04em"
      >
        842W
      </text>
      <text
        x={lcdX + lcdW / 2}
        y={lcdY + lcdH * 0.86}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={3.2}
        fill={COMPONENTS.lcdBlueInk}
        opacity={0.7}
        letterSpacing="0.1em"
      >
        7.1A · 120V
      </text>

      {/* status LED column right of LCD */}
      {[
        { c: COMPONENTS.ledActive, l: "PWR" },
        { c: COMPONENTS.ledActive, l: "NET" },
        { c: COMPONENTS.ledOff, l: "ALM" },
      ].map((s, i) => (
        <g key={i}>
          <LedBloom
            cx={lcdX + lcdW + 3}
            cy={h * 0.26 + i * h * 0.18}
            r={0.5}
            color={s.c}
          />
          <text
            x={lcdX + lcdW + 5}
            y={h * 0.26 + i * h * 0.18 + 1}
            fontFamily="ui-monospace, monospace"
            fontSize={2.4}
            fill={c.stroke}
            letterSpacing="0.05em"
          >
            {s.l}
          </text>
        </g>
      ))}

      {/* 8 NEMA 5-15R outlets — happy faces with smile-D ground */}
      {Array.from({ length: outlets }).map((_, i) => {
        const cx = outletsX + i * (outletSize + outletGap) + outletSize / 2;
        return (
          <NemaOutlet
            key={i}
            cx={cx}
            cy={outletCy}
            size={outletSize}
            c={c}
            active={i !== offlineIdx}
          />
        );
      })}

      {/* breaker button — domed */}
      <rect
        x={breakerX}
        y={h * 0.22}
        width={breakerW}
        height={h * 0.56}
        rx={1.5}
        fill={c.lo}
        stroke={c.stroke}
        strokeWidth={0.4}
      />
      <circle
        cx={breakerX + breakerW / 2}
        cy={h * 0.5}
        r={1.8}
        fill={c.stroke}
        opacity={0.4}
      />
      <circle
        cx={breakerX + breakerW / 2}
        cy={h * 0.5}
        r={1.6}
        fill={accent}
        opacity={0.92}
      />
      <circle
        cx={breakerX + breakerW / 2 - 0.4}
        cy={h * 0.5 - 0.4}
        r={0.45}
        fill={COMPONENTS.metalHi}
        opacity={0.4}
      />
      <text
        x={breakerX + breakerW / 2}
        y={h * 0.92}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={2.4}
        fill={c.stroke}
        letterSpacing="0.05em"
      >
        BREAKER
      </text>

      <RackEarHole cx={ear / 2} cy={h * 0.28} c={c} />
      <RackEarHole cx={ear / 2} cy={h * 0.72} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.28} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.72} c={c} />
    </g>
  );
}

/* === TrippLite SU1500RTXL2UA — 2U UPS ============================ */
function RenderUps({ c, accent, w, h }: Ctx) {
  const ear = 8;
  const bodyX = ear;
  const bodyW = w - ear * 2;
  const lcdX = bodyX + 6;
  const lcdY = h * 0.14;
  const lcdW = bodyW * 0.26;
  const lcdH = h * 0.72;
  const colX = lcdX + lcdW + 6;
  const loadX = colX + 14;
  const loadW = bodyW * 0.3;
  const loadY = h * 0.46;
  const loadH = h * 0.16;
  const outletsX = loadX + loadW + 10;
  const outletsW = bodyW - (outletsX - bodyX) - 8;
  const outletCols = 3;
  const outletRows = 2;
  const outletGapX = 1.5;
  const outletGapY = 1.5;
  const outletSize = Math.min(
    (outletsW - outletGapX * (outletCols - 1)) / outletCols,
    (h * 0.74 - outletGapY * (outletRows - 1)) / outletRows / 1.05,
  );
  return (
    <g>
      <ChassisFrame x={bodyX} y={0} w={bodyW} h={h} c={c} />

      {/* crimson accent rail along the top */}
      <rect
        x={bodyX + 4}
        y={h * 0.04}
        width={bodyW - 8}
        height={0.6}
        rx={0.3}
        fill={accent}
        opacity={0.95}
      />
      <rect
        x={bodyX + 5}
        y={h * 0.04}
        width={bodyW - 10}
        height={0.18}
        rx={0.1}
        fill={COMPONENTS.metalHi}
        opacity={0.35}
      />

      {/* big LCD — blue-backlit */}
      <rect
        x={lcdX - 1}
        y={lcdY - 1}
        width={lcdW + 2}
        height={lcdH + 2}
        rx={2.2}
        fill={c.lo}
      />
      <rect
        x={lcdX}
        y={lcdY}
        width={lcdW}
        height={lcdH}
        rx={1.7}
        fill={COMPONENTS.lcdBlue}
      />
      <LcdScanlines
        x={lcdX}
        y={lcdY}
        w={lcdW}
        h={lcdH}
        ink={COMPONENTS.lcdBlueInk}
        opacity={0.05}
      />
      <text
        x={lcdX + 6}
        y={lcdY + lcdH * 0.26}
        fontFamily="ui-monospace, monospace"
        fontSize={6.5}
        fontWeight={700}
        fill={COMPONENTS.lcdBlueInk}
        letterSpacing="0.06em"
      >
        ONLINE
      </text>
      <text
        x={lcdX + lcdW - 6}
        y={lcdY + lcdH * 0.26}
        textAnchor="end"
        fontFamily="ui-monospace, monospace"
        fontSize={7}
        fontWeight={800}
        fill={COMPONENTS.lcdBlueInk}
      >
        62%
      </text>
      <text
        x={lcdX + 6}
        y={lcdY + lcdH * 0.5}
        fontFamily="ui-monospace, monospace"
        fontSize={5}
        fill={COMPONENTS.lcdBlueInk}
        opacity={0.85}
        letterSpacing="0.08em"
      >
        1500VA · 18m
      </text>
      {/* battery icon */}
      <rect
        x={lcdX + 6}
        y={lcdY + lcdH * 0.66}
        width={lcdW * 0.55}
        height={3.4}
        rx={0.5}
        fill="none"
        stroke={COMPONENTS.lcdBlueInk}
        strokeWidth={0.4}
      />
      <rect
        x={lcdX + lcdW * 0.55 + 6 + 0.4}
        y={lcdY + lcdH * 0.66 + 0.8}
        width={0.7}
        height={1.8}
        rx={0.2}
        fill={COMPONENTS.lcdBlueInk}
      />
      <rect
        x={lcdX + 6.5}
        y={lcdY + lcdH * 0.66 + 0.5}
        width={lcdW * 0.36}
        height={2.4}
        rx={0.3}
        fill={COMPONENTS.lcdBlueInk}
        opacity={0.85}
      />
      {/* lightning bolt next to battery */}
      <path
        d={`M ${lcdX + lcdW - 7},${lcdY + lcdH * 0.7}
            l 1.6,-2.4 l -0.8,0 l 0.8,-2.4 l 2.0,2.4 l -0.8,0 l 0.8,2.4 z`}
        fill={COMPONENTS.lcdBlueInk}
        opacity={0.85}
      />

      {/* status LED column with labels */}
      {[
        { c: COMPONENTS.ledActive, l: "ONLINE" },
        { c: COMPONENTS.ledOff, l: "BATTERY" },
        { c: COMPONENTS.ledOff, l: "OVERLOAD" },
        { c: COMPONENTS.ledOff, l: "FAULT" },
      ].map((s, i) => (
        <g key={i}>
          <LedBloom
            cx={colX}
            cy={lcdY + 4 + i * (lcdH / 4)}
            r={0.7}
            color={s.c}
          />
          <text
            x={colX + 3}
            y={lcdY + 5.3 + i * (lcdH / 4)}
            fontFamily="ui-monospace, monospace"
            fontSize={3.6}
            fill={c.stroke}
            letterSpacing="0.05em"
          >
            {s.l}
          </text>
        </g>
      ))}

      {/* segmented LED bar graph */}
      <text
        x={loadX}
        y={loadY - 1.5}
        fontFamily="ui-monospace, monospace"
        fontSize={3.6}
        fill={c.stroke}
        letterSpacing="0.08em"
      >
        LOAD
      </text>
      <LedBarGraph
        x={loadX}
        y={loadY}
        w={loadW}
        h={loadH}
        segments={10}
        pct={62}
        c={c}
      />

      {/* TRIPP·LITE wordmark */}
      <text
        x={loadX + loadW / 2}
        y={loadY + loadH + 7}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={6}
        fontWeight={800}
        fill={accent}
        letterSpacing="0.18em"
      >
        TRIPP·LITE
      </text>

      {/* 6 NEMA outlets in a 3×2 grid */}
      {Array.from({ length: outletRows }).map((_, ri) =>
        Array.from({ length: outletCols }).map((__, ci) => {
          const cx = outletsX + ci * (outletSize + outletGapX) + outletSize / 2;
          const cy =
            h * 0.16 +
            (outletSize * 1.05) / 2 +
            ri * (outletSize * 1.05 + outletGapY);
          return (
            <NemaOutlet
              key={`${ri}-${ci}`}
              cx={cx}
              cy={cy}
              size={outletSize}
              c={c}
              active={true}
            />
          );
        }),
      )}

      <RackEarHole cx={ear / 2} cy={h * 0.18} c={c} />
      <RackEarHole cx={ear / 2} cy={h * 0.5} c={c} />
      <RackEarHole cx={ear / 2} cy={h * 0.82} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.18} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.5} c={c} />
      <RackEarHole cx={w - ear / 2} cy={h * 0.82} c={c} />
    </g>
  );
}

/* ============================================================
 * Devices manifest
 * ============================================================ */
type Device = {
  id: string;
  modelLabel: string;
  make: Make;
  model: Model;
  sizeU: 1 | 2;
  Render: (ctx: Ctx) => React.JSX.Element;
};

const DEVICES: Device[] = [
  {
    id: "udm-pro",
    modelLabel: "UDM-Pro · gateway",
    make: "ubiquiti",
    model: "gateway",
    sizeU: 1,
    Render: RenderUdmPro,
  },
  {
    id: "usw-pro-48",
    modelLabel: "USW-Pro-48-PoE · PoE switch",
    make: "ubiquiti",
    model: "poe-switch",
    sizeU: 1,
    Render: RenderUswPro48,
  },
  {
    id: "c9300",
    modelLabel: "Catalyst 9300-48P · managed switch",
    make: "cisco",
    model: "switch",
    sizeU: 1,
    Render: RenderC9300,
  },
  {
    id: "r750",
    modelLabel: "PowerEdge R750 · 1U server",
    make: "dell",
    model: "server",
    sizeU: 1,
    Render: RenderR750,
  },
  {
    id: "pdu",
    modelLabel: "PDUMH20-NET · rack PDU",
    make: "tripplite",
    model: "pdu",
    sizeU: 1,
    Render: RenderPdu,
  },
  {
    id: "ups",
    modelLabel: "SU1500RTXL2UA · 2U UPS",
    make: "tripplite",
    model: "ups",
    sizeU: 2,
    Render: RenderUps,
  },
];

function DeviceCard({ device, height }: { device: Device; height: number }) {
  const c = chassisColors(device.make, device.model);
  const accent = MAKE_PALETTE[device.make].accent;
  const wordmark = MAKE_PALETTE[device.make].wordmark;
  const aspect = 500 / 46;
  const renderHeight = height * device.sizeU;
  const width = Math.round(height * aspect);
  const vbH = 46 * device.sizeU;
  return (
    <div
      style={{ width, height: renderHeight }}
      className="overflow-visible rounded-md bg-[#0a0e1a] ring-1 ring-white/5"
    >
      <svg
        viewBox={`0 0 500 ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        className="block h-full w-full"
      >
        <device.Render
          c={c}
          accent={accent}
          wordmark={wordmark}
          w={500}
          h={vbH}
        />
      </svg>
    </div>
  );
}

function PrimitivePreview({
  label,
  size,
  children,
}: {
  label: string;
  size: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div
        className="rounded-md bg-[#0a0e1a] ring-1 ring-white/5"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 30 30"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
          className="block h-full w-full"
        >
          {children}
        </svg>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-white/55">
        {label}
      </div>
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-9 w-14 rounded-md ring-1 ring-white/10"
        style={{ backgroundColor: color }}
      />
      <div className="font-mono text-[10px] text-white/65">
        <div className="uppercase tracking-wider text-white/45">{label}</div>
        <div>{color}</div>
      </div>
    </div>
  );
}

export default function ChassisStylesPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const sampleC = chassisColors("dell", "switch");
  const sampleC2 = chassisColors("tripplite", "pdu");

  return (
    <main className="min-h-screen bg-[#0a0e1a] px-12 py-16 text-white">
      <div className="mx-auto max-w-7xl space-y-20">
        <header className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-white/40">
            Design exploration · 2026-04-28 · v2 (round 8 — final polish)
          </p>
          <h1 className="text-3xl font-semibold">
            Sleek + professional + happy-face outlets
          </h1>
          <p className="max-w-3xl text-sm text-white/65">
            Final polish pass. NEMA 5-15R outlets now have proper smile-D ground
            holes (the curved bottom + flat top — distinct American 120V plug
            look). RJ45 jacks render 8 individual gold contact pins. SFP+ cages
            have an internal depth gradient. LCDs gain faint scanlines. UPS load
            is now a 10-segment LED bar graph. Drive bay levers have metallic
            highlight stripes. Chassis edges + bezels refined for that premium
            hardware feel.
          </p>
        </header>

        <section className="space-y-6">
          <header className="border-l-2 border-white/15 pl-5">
            <p className="text-xs font-mono uppercase tracking-wider text-white/40">
              Primitives at full scale
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              Each component in isolation
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/65">
              Refinements visible at ~150px. The NEMA outlet shows the new
              smile-D ground hole.
            </p>
          </header>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <PrimitivePreview label="RJ45 (8 contact pins)" size={150}>
              <EthPort x={3} y={6} w={24} h={18} />
            </PrimitivePreview>
            <PrimitivePreview label="SFP+ cage (depth)" size={150}>
              <SfpCage x={5} y={3} w={20} h={24} />
            </PrimitivePreview>
            <PrimitivePreview label="NEMA outlet (happy face)" size={150}>
              <NemaOutlet cx={15} cy={15} size={20} c={sampleC2} />
            </PrimitivePreview>
            <PrimitivePreview label="2.5″ drive bay" size={150}>
              <DriveBay
                x={9}
                y={2}
                w={12}
                h={26}
                c={sampleC}
                active={true}
                status="ok"
              />
            </PrimitivePreview>
          </div>
        </section>

        <section className="space-y-12">
          <header className="border-l-2 border-white/15 pl-5">
            <p className="text-xs font-mono uppercase tracking-wider text-white/40">
              Per-device examples
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              Six device types — final polish applied
            </h2>
          </header>

          {DEVICES.map((device) => (
            <div key={device.id} className="space-y-6">
              <header className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold">{device.modelLabel}</h3>
                <span className="font-mono text-[11px] uppercase tracking-wider text-white/40">
                  make: {device.make} · model: {device.model} · {device.sizeU}U
                </span>
              </header>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">
                    60px (rack slot)
                  </p>
                  <div className="mt-2">
                    <DeviceCard device={device} height={60} />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">
                    200px (hero)
                  </p>
                  <div className="mt-2">
                    <DeviceCard device={device} height={200} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-12 border-t border-white/10 pt-16">
          <header className="border-l-2 border-white/15 pl-5">
            <p className="text-xs font-mono uppercase tracking-wider text-white/40">
              Color systems
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              Make × model × shared components
            </h2>
          </header>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/55">
              Make families
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4 font-mono uppercase text-white/40">
                      make
                    </th>
                    <th className="py-2 pr-4 font-mono uppercase text-white/40">
                      hue · sat
                    </th>
                    <th className="py-2 pr-4 font-mono uppercase text-white/40">
                      accent
                    </th>
                    {(Object.keys(MODEL_LIGHTNESS) as Model[]).map((m) => (
                      <th
                        key={m}
                        className="py-2 pr-4 font-mono uppercase text-white/40"
                      >
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(MAKE_PALETTE) as Make[]).map((make) => {
                    const m = MAKE_PALETTE[make];
                    return (
                      <tr key={make} className="border-b border-white/5">
                        <td className="py-3 pr-4 font-mono text-white/80">
                          {make}
                        </td>
                        <td className="py-3 pr-4 font-mono text-white/55">
                          {m.hue}° · {m.sat}%
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-5 w-5 rounded-sm ring-1 ring-white/10"
                              style={{ backgroundColor: m.accent }}
                            />
                            <span className="font-mono text-white/55">
                              {m.accent}
                            </span>
                          </div>
                        </td>
                        {(Object.keys(MODEL_LIGHTNESS) as Model[]).map(
                          (model) => {
                            const c = chassisColors(make, model);
                            return (
                              <td key={model} className="py-3 pr-4">
                                <div
                                  className="h-7 w-12 rounded-sm ring-1 ring-white/10"
                                  style={{ backgroundColor: c.base }}
                                  title={c.base}
                                />
                              </td>
                            );
                          },
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/55">
              Model lightness
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
              {(Object.keys(MODEL_LIGHTNESS) as Model[]).map((model) => {
                const c = chassisColors("ubiquiti", model);
                return (
                  <div key={model} className="space-y-2">
                    <div
                      className="h-12 w-full rounded-md ring-1 ring-white/10"
                      style={{ backgroundColor: c.base }}
                    />
                    <div className="font-mono text-[10px] text-white/65">
                      <div className="uppercase tracking-wider text-white/80">
                        {model}
                      </div>
                      <div>L: {MODEL_LIGHTNESS[model]}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/55">
              Shared components
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              <Swatch color={COMPONENTS.cavity} label="port cavity" />
              <Swatch color={COMPONENTS.cavityAlt} label="cavity alt" />
              <Swatch color={COMPONENTS.cavityDeep} label="cavity deep" />
              <Swatch color={COMPONENTS.contactGold} label="RJ45 backing" />
              <Swatch color={COMPONENTS.contactGoldHi} label="RJ45 pins" />
              <Swatch color={COMPONENTS.lcdBg} label="LCD bg" />
              <Swatch color={COMPONENTS.lcdAmber} label="LCD amber (Dell)" />
              <Swatch color={COMPONENTS.lcdBlue} label="LCD blue (TL)" />
              <Swatch color={COMPONENTS.driveBay} label="drive bay" />
              <Swatch color={COMPONENTS.metalHi} label="metal highlight" />
              <Swatch color={COMPONENTS.ledActive} label="LED active" />
              <Swatch color={COMPONENTS.ledWarn} label="LED warn (PoE)" />
              <Swatch color={COMPONENTS.ledDanger} label="LED danger" />
              <Swatch color={COMPONENTS.ledOff} label="LED off" />
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 pt-6 text-xs text-white/40">
          Page is dev-only — production returns 404.
        </footer>
      </div>
    </main>
  );
}
