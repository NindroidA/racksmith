# Security Policy

## Supported versions

RackSmith is in a pre-launch building-in-private phase. Once launched,
only the current main branch / latest tagged release will receive
security fixes. Until then, any commit on `main` is considered the
supported version.

| Version | Supported |
|---|---|
| `main` (pre-launch) | ✅ |
| Forks / old commits | ❌ |

## Reporting a vulnerability

**Please don't file a public GitHub issue for security bugs.** We need a
chance to patch before disclosure.

Email a description to **security@nindroid.systems** with:

- A clear description of the issue and its impact (auth bypass, SSRF, data
  exfiltration, etc.)
- Steps to reproduce, ideally with a minimal proof-of-concept
- The commit hash or release tag you tested against
- Your name/handle if you'd like credit in the advisory

We'll acknowledge within **72 hours** and aim to ship a fix within **14 days**
for high-severity issues. We'll coordinate public disclosure with you.

### Optional: PGP

If you need to encrypt your report, request a public key at the same email
address. Don't send secrets over an unverified channel.

## What counts as in-scope

- Authentication / authorization bypass
- Cross-site scripting (XSS), cross-site request forgery (CSRF)
- Server-side request forgery (SSRF), especially via the auto-discovery
  subnet input
- SQL / Prisma injection
- Server-side template injection
- Insecure direct object references (IDOR) — every query should filter by
  `userId`; if you find one that doesn't, that's in-scope
- Secrets leaking in logs, error responses, or build artifacts
- Container escape / privilege escalation in the Docker image
- Publicly exposed admin / debug routes (e.g. `/graphics-preview` leaking
  into production)

## What's out of scope

- Missing security headers on static marketing pages (we set them on the
  app, not every domain)
- Reports that require social engineering, physical access, or compromised
  credentials the user chose
- Reports against dependencies unless RackSmith's usage directly enables
  exploitation
- Rate limits being "too generous" — the defaults in `src/lib/auth.ts` are
  tunable
- Best-practice nit-picks without an attack chain (e.g. "your CSP could be
  stricter")

## Hall of fame

We'll list researchers who responsibly disclose significant issues here
after each advisory, with your permission.
