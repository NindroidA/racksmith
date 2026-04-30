// Next.js 16 middleware-by-convention. This file is loaded automatically for
// every request matching `config.matcher` below — it is NOT imported from any
// application code. Do not delete it as "orphaned"; the mechanical dead-code
// scan will flag this file (zero importers in the source graph) but removing
// it drops the app's only session-cookie redirect gate. See CLAUDE.md →
// "Proxy-based route protection" for the full policy (including why
// /invite/[id] and /ownership-transfer/[id] live in PUBLIC_PATHS).
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/two-factor-verify",
  // Invitation + ownership-transfer landing pages handle their own auth
  // gating so they can read the token and redirect to /login with a
  // callbackURL preserving the link.
  "/invite",
  "/ownership-transfer",
  "/api/auth",
  "/api/health",
  // Stripe webhooks arrive without a session cookie. Auth is handled by
  // HMAC signature verification inside the route handler.
  "/api/webhooks",
  // Dev-only scratch routes for design iteration. Pages under /dev/*
  // call notFound() in production.
  "/dev",
  // /api/v1/* uses bearer-token auth via requireApiKey() in the route
  // factory; the proxy's session-cookie check doesn't apply. The factory's
  // own auth chain returns proper 401/403 JSON responses instead of HTML
  // login redirects — correct behavior for an API consumer.
  "/api/v1",
  // Generated metadata routes (favicon, OG image, manifest, robots)
  "/icon",
  "/apple-icon",
  "/opengraph-image",
  "/twitter-image",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("better-auth.session_token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Exclude Next.js internals + static public assets (images under public/)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|device-images|screenshots|logo.png).*)",
  ],
};
