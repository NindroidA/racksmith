import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const baseSecurityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), camera=(), microphone=(), interest-cohort=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const securityHeaders = [
  ...baseSecurityHeaders,
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inlines runtime scripts; 'unsafe-inline' + 'unsafe-eval' are needed for dev HMR and framer-motion
      isProd
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

// Scalar API reference is loaded from jsdelivr CDN on /api/v1/docs; narrow carve-out
// so the global strict CSP stays intact for every other route.
const docsSecurityHeaders = [
  ...baseSecurityHeaders,
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      isProd
        ? "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https://cdn.jsdelivr.net",
      "font-src 'self' data: https://cdn.jsdelivr.net",
      "connect-src 'self' https://cdn.jsdelivr.net",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-auth"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Next.js header-override semantics: when multiple sources match the same
      // request path and set the same key, the LAST matching entry in this array
      // wins. This narrow carve-out for /api/v1/docs replaces the strict
      // Content-Security-Policy from the catch-all above so Scalar's bundle can
      // load from cdn.jsdelivr.net — only on the docs route.
      {
        source: "/api/v1/docs",
        headers: docsSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
