"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0e1a",
          color: "#fff",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            padding: 32,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(17,24,39,0.6)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Application error
          </div>
          <div
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              marginBottom: 24,
            }}
          >
            Something broke at the root of RackSmith. Reloading usually fixes
            it.
          </div>
          {error.digest && (
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.4)",
                marginBottom: 16,
              }}
            >
              Error ID: <code>{error.digest}</code>
            </div>
          )}
          <button
            onClick={reset}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              background: "#3b82f6",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
