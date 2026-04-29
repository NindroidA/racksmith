import { notFound } from "next/navigation";
import { DeviceGraphic } from "@/components/rack/device-graphic/device-graphic";

export const dynamic = "force-static";

/**
 * Phase C visual verification — Cisco / Dell / TrippLite tier-1
 * renderers via the real `DeviceGraphic` dispatch. Same gating + page
 * shape as the phase-b sibling.
 */

const DEVICES = [
  {
    deviceType: "switch",
    manufacturer: "cisco",
    model: "C9300-48P",
    sizeU: 1,
    portCount: 48,
    label: "Catalyst 9300-48P · 48-port managed switch",
  },
  {
    deviceType: "server",
    manufacturer: "dell",
    model: "R750",
    sizeU: 2,
    portCount: 4,
    label: "PowerEdge R750 · 2U server (12× 3.5\" drives)",
  },
  {
    deviceType: "pdu",
    manufacturer: "tripplite",
    model: "PDUMV30HV",
    sizeU: 1,
    portCount: 0,
    outletCount: 8,
    label: "PDUMV30HV · metered rack PDU",
  },
  {
    deviceType: "ups",
    manufacturer: "tripplite",
    model: "SU1500RTXL2UA",
    sizeU: 2,
    portCount: 0,
    vaRating: "1500VA",
    batteryLevel: 62,
    label: "SmartOnline 1500VA · 2U UPS",
  },
] as const;

export default function PhaseCRenderersPage() {
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
        Phase C — Cisco / Dell / TrippLite renderers (via DeviceGraphic dispatch)
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
                  {...("outletCount" in d ? { outletCount: d.outletCount } : {})}
                  {...("vaRating" in d ? { vaRating: d.vaRating } : {})}
                  {...("batteryLevel" in d ? { batteryLevel: d.batteryLevel } : {})}
                />
                <div
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    marginTop: 4,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  hero · 1080 wide
                </div>
              </div>
              <div style={{ width: 540 }}>
                <DeviceGraphic
                  deviceType={d.deviceType}
                  manufacturer={d.manufacturer}
                  model={d.model}
                  sizeU={d.sizeU}
                  portCount={d.portCount}
                  {...("outletCount" in d ? { outletCount: d.outletCount } : {})}
                  {...("vaRating" in d ? { vaRating: d.vaRating } : {})}
                  {...("batteryLevel" in d ? { batteryLevel: d.batteryLevel } : {})}
                />
                <div
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    marginTop: 4,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  rack · 540 wide
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
