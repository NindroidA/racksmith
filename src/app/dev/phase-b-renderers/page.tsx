import { notFound } from "next/navigation";
import { DeviceGraphic } from "@/components/rack/device-graphic/device-graphic";

export const dynamic = "force-static";

/**
 * Phase B visual verification — renders the four UniFi renderers via
 * the real `DeviceGraphic` dispatch (not the standalone preview page).
 * Lets us confirm:
 *   1. `pickModelComponent` routes catalog (manufacturer, model) pairs
 *      to the right per-model component
 *   2. Each renderer reads as a distinct silhouette at both rack-slot
 *      (60px) and hero (200px) scale
 *   3. Visual style matches the canonical art template at
 *      `/dev/chassis-styles`
 *
 * Production-gated via `notFound()` — same gating as the chassis-styles
 * page. Internal-only reference.
 */

const DEVICES = [
  {
    deviceType: "router",
    manufacturer: "ubiquiti",
    model: "UDM-Pro",
    sizeU: 1,
    portCount: 11,
    label: "UDM-Pro · gateway",
  },
  {
    deviceType: "switch",
    manufacturer: "ubiquiti",
    model: "USW-Pro-48-PoE",
    sizeU: 1,
    portCount: 48,
    label: "USW-Pro-48-PoE · 48-port switch",
  },
  {
    deviceType: "switch",
    manufacturer: "ubiquiti",
    model: "USW-Enterprise-24-PoE",
    sizeU: 1,
    portCount: 24,
    label: "USW-Enterprise-24-PoE · 24-port 2.5G switch",
  },
  {
    deviceType: "switch",
    manufacturer: "ubiquiti",
    model: "USW-Aggregation",
    sizeU: 1,
    portCount: 8,
    label: "USW-Aggregation · 8× SFP+",
  },
] as const;

export default function PhaseBRenderersPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main
      style={{
        background: "#0a0e1a",
        color: "#e2e8f0",
        minHeight: "100vh",
        padding: "32px",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Phase B — UniFi renderers (via DeviceGraphic dispatch)
      </h1>
      <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 32 }}>
        Each row renders a catalog SKU through{" "}
        <code>{`<DeviceGraphic />`}</code>, exercising the
        <code> pickModelComponent</code> dispatch. Hero scale on the left,
        rack-slot scale on the right. Reference style:{" "}
        <a
          href="/dev/chassis-styles"
          style={{ color: "#6a9de0", textDecoration: "underline" }}
        >
          /dev/chassis-styles
        </a>
        .
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {DEVICES.map((d) => (
          <section key={d.model}>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: "#cbd5e1",
                fontFamily: "ui-monospace, monospace",
                letterSpacing: "0.04em",
              }}
            >
              {d.label}
            </h2>
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
              <div style={{ width: 1080 }}>
                <DeviceGraphic
                  deviceType={d.deviceType}
                  manufacturer={d.manufacturer}
                  model={d.model}
                  sizeU={d.sizeU}
                  portCount={d.portCount}
                />
                <div
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    marginTop: 4,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  hero · 1080×{Math.round(1080 / 10.86) * d.sizeU}
                </div>
              </div>
              <div style={{ width: 540 }}>
                <DeviceGraphic
                  deviceType={d.deviceType}
                  manufacturer={d.manufacturer}
                  model={d.model}
                  sizeU={d.sizeU}
                  portCount={d.portCount}
                />
                <div
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    marginTop: 4,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  rack · 540×{Math.round(540 / 10.86) * d.sizeU}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
