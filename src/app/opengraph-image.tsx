import { ImageResponse } from "next/og";

export const alt = "RackSmith — Your Infrastructure, Beautifully Documented";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0e1a",
          backgroundImage:
            "radial-gradient(at 15% 20%, rgba(59,130,246,0.30) 0px, transparent 50%), radial-gradient(at 85% 80%, rgba(139,92,246,0.25) 0px, transparent 50%)",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, sans-serif",
          color: "white",
          position: "relative",
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Logo + brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 64,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              background: "linear-gradient(90deg, #3b82f6, #a78bfa)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            RackSmith
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Your infrastructure,</span>
          <span
            style={{
              background: "linear-gradient(90deg, #60a5fa, #c4b5fd)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            beautifully documented.
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 40,
            fontSize: 28,
            color: "rgba(255,255,255,0.65)",
            zIndex: 1,
          }}
        >
          Rack visualization · Device inventory · Network topology ·
          Auto-discovery
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 1,
            color: "rgba(255,255,255,0.5)",
            fontSize: 22,
          }}
        >
          <span>The middle ground between NetBox and draw.io</span>
          <span>Self-hosted · Free & open source</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
