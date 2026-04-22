// Renders the Scalar API reference as a full HTML page. Scalar's client
// fetches the spec from /api/v1/openapi.json at load time.
//
// We use the CDN-hosted vanilla @scalar/api-reference bundle rather than
// the React component (`@scalar/api-reference-react`) — the CDN version
// is a thin HTML shell with no build-time React dependency, keeping the
// route-handler bundle lean. The React package is available in the repo
// (installed in A1) for future use if we want tighter integration.
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RackSmith API · v1 docs</title>
</head>
<body>
  <script id="api-reference" data-url="/api/v1/openapi.json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control":
        process.env.NODE_ENV === "production"
          ? "public, max-age=3600"
          : "no-cache",
    },
  });
}
