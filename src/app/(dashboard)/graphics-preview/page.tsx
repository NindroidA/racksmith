import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { getBrandPalette } from "@/components/rack/device-graphic/brand-palette";
import { SwitchFaceplate } from "@/components/rack/device-graphic/types/switch";
import { ServerFaceplate } from "@/components/rack/device-graphic/types/server";
import { UpsFaceplate } from "@/components/rack/device-graphic/types/ups";

/** Real rack proportions: 19" × 1.75"/U → 10.86 aspect-ratio per U */
const U_ASPECT = 10.86;

type Sample = {
  label: string;
  sub: string;
  sizeU: number;
  render: () => React.ReactNode;
};

const SAMPLES: Sample[] = [
  {
    label: "Cisco Catalyst 9200L-24T",
    sub: "24-port switch · 1U · Cisco",
    sizeU: 1,
    render: () => (
      <SwitchFaceplate
        palette={getBrandPalette("cisco")}
        manufacturer="cisco"
        portCount={24}
        sizeU={1}
        sfpCount={4}
        model="C9200L"
      />
    ),
  },
  {
    label: "Cisco Catalyst 9300-48P",
    sub: "48-port PoE switch · 1U · Cisco",
    sizeU: 1,
    render: () => (
      <SwitchFaceplate
        palette={getBrandPalette("cisco")}
        manufacturer="cisco"
        portCount={48}
        sizeU={1}
        sfpCount={4}
        hasPoE
        model="C9300-48P"
      />
    ),
  },
  {
    label: "UniFi Switch Pro 48 PoE",
    sub: "48-port PoE switch · 1U · Ubiquiti",
    sizeU: 1,
    render: () => (
      <SwitchFaceplate
        palette={getBrandPalette("ubiquiti")}
        manufacturer="ubiquiti"
        portCount={48}
        sizeU={1}
        sfpCount={4}
        hasPoE
        model="USW-PRO-48"
      />
    ),
  },
  {
    label: "HPE Aruba 6300M 24G",
    sub: "24-port switch · 1U · HPE",
    sizeU: 1,
    render: () => (
      <SwitchFaceplate
        palette={getBrandPalette("hp")}
        manufacturer="hp"
        portCount={24}
        sizeU={1}
        sfpCount={4}
        model="6300M"
      />
    ),
  },
  {
    label: "Dell PowerEdge R650",
    sub: "1U server · 8 bays · Dell",
    sizeU: 1,
    render: () => (
      <ServerFaceplate
        palette={getBrandPalette("dell")}
        manufacturer="dell"
        sizeU={1}
        bayRows={1}
        bayCols={8}
        model="R650"
      />
    ),
  },
  {
    label: "Dell PowerEdge R750",
    sub: "2U server · 16 bays · Dell",
    sizeU: 2,
    render: () => (
      <ServerFaceplate
        palette={getBrandPalette("dell")}
        manufacturer="dell"
        sizeU={2}
        bayRows={2}
        bayCols={8}
        model="R750"
      />
    ),
  },
  {
    label: "HPE ProLiant DL380 Gen10",
    sub: "2U server · 8 LFF · HPE",
    sizeU: 2,
    render: () => (
      <ServerFaceplate
        palette={getBrandPalette("hp")}
        manufacturer="hp"
        sizeU={2}
        bayRows={2}
        bayCols={4}
        driveForm="3.5in"
        model="DL380"
      />
    ),
  },
  {
    label: "TrippLite SmartOnline 1500VA",
    sub: "2U UPS · TrippLite",
    sizeU: 2,
    render: () => (
      <UpsFaceplate
        palette={getBrandPalette("tripplite")}
        sizeU={2}
        batteryLevel={87}
        vaRating="1500VA"
        model="SU1500"
      />
    ),
  },
  {
    label: "TrippLite SmartOnline 3000VA",
    sub: "3U UPS · TrippLite",
    sizeU: 3,
    render: () => (
      <UpsFaceplate
        palette={getBrandPalette("tripplite")}
        sizeU={3}
        batteryLevel={100}
        vaRating="3000VA"
        model="SU3000"
      />
    ),
  },
];

function slotStyle(sizeU: number): React.CSSProperties {
  // Real rack aspect: each U has 10.86:1 width-to-height
  return { aspectRatio: `${U_ASPECT} / ${sizeU}`, width: "100%" };
}

export default async function GraphicsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  await requireUser();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Device Graphics Preview
        </h1>
        <p className="mt-1 text-white/60">
          Rebuilt with real 10.86:1 aspect ratio per U, flat UniFi-inspired art
          style.
        </p>
      </div>

      {/* Rack-scale — this is what you'll see in the rack visualizer */}
      <section className="mb-12">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
          At real rack proportions
        </h2>
        <div className="mx-auto max-w-[700px] rounded-xl border-2 border-white/10 bg-black/50 p-3">
          <div className="space-y-1">
            {SAMPLES.map((sample) => (
              <div
                key={sample.label}
                className="group relative overflow-hidden rounded"
                style={slotStyle(sample.sizeU)}
                title={sample.label}
              >
                {sample.render()}
              </div>
            ))}
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-[700px] text-xs text-white/40">
          Max 700px wide container. Each device renders at its real{" "}
          <span className="font-mono">10.86:1</span> ratio per U — no
          stretching.
        </p>
      </section>

      {/* Side-by-side — same device, different brands */}
      <section className="mb-12">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
          Same device type across brands
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SAMPLES.filter((s) =>
            [
              "Cisco Catalyst 9200L-24T",
              "UniFi Switch Pro 48 PoE",
              "Cisco Catalyst 9300-48P",
              "HPE Aruba 6300M 24G",
            ].includes(s.label),
          ).map((sample) => (
            <div
              key={`cmp-${sample.label}`}
              className="glass-card rounded-xl p-4"
            >
              <div className="mb-3">
                <div className="text-sm font-medium text-white">
                  {sample.label}
                </div>
                <div className="text-xs text-white/50">{sample.sub}</div>
              </div>
              <div
                className="overflow-hidden rounded"
                style={slotStyle(sample.sizeU)}
              >
                {sample.render()}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hero size — for device detail pages */}
      <section className="mb-12">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
          Hero size — device detail page
        </h2>
        <div className="glass-card rounded-2xl p-8">
          <div className="mb-5">
            <div className="text-xl font-semibold text-white">
              Dell PowerEdge R750
            </div>
            <div className="text-sm text-white/60">
              2U · 16 drive bays · Dell PowerEdge series
            </div>
          </div>
          <div
            className="mx-auto max-w-3xl overflow-hidden rounded-xl"
            style={slotStyle(2)}
          >
            <ServerFaceplate
              palette={getBrandPalette("dell")}
              sizeU={2}
              bayRows={2}
              bayCols={8}
              model="R750"
            />
          </div>
        </div>
      </section>

      {/* Palette thumbnails — for device-palette sidebar */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
          Palette thumbnails
        </h2>
        <div className="max-w-md space-y-2">
          {SAMPLES.slice(0, 6).map((sample) => (
            <div
              key={`thumb-${sample.label}`}
              className="glass-card flex items-center gap-3 rounded-lg p-2.5"
            >
              <div
                className="shrink-0 overflow-hidden rounded"
                style={{ width: "120px", ...slotStyle(sample.sizeU) }}
              >
                {sample.render()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {sample.label}
                </div>
                <div className="truncate text-xs text-white/50">
                  {sample.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
