import { describe, expect, it } from "vitest";
import { OWNERSHIP_TRANSFER_TTL_DAYS } from "./ownership-transfer-constants";
import {
  organizationInviteEmail,
  ownershipTransferEmail,
  passwordResetEmail,
  verificationEmail,
} from "./email-templates";

describe("passwordResetEmail", () => {
  it("includes the reset URL in both html and text", () => {
    const url = "https://example.com/reset?token=abc";
    const out = passwordResetEmail(url);
    expect(out.html).toContain(url);
    expect(out.text).toContain(url);
  });
  it("subject mentions the brand", () => {
    expect(passwordResetEmail("x").subject).toMatch(/RackSmith/);
  });
});

describe("verificationEmail", () => {
  it("includes the verify URL in both html and text", () => {
    const url = "https://example.com/verify?token=xyz";
    const out = verificationEmail(url);
    expect(out.html).toContain(url);
    expect(out.text).toContain(url);
  });
});

describe("organizationInviteEmail — XSS escaping", () => {
  // Org name + inviter name + role flow into the rendered HTML body. A user
  // with permission to invite shouldn't be able to inject <script> tags or
  // break out of attribute values via " or '. The acceptUrl is also escaped
  // because it's interpolated as both an href and inline body text.
  it("escapes < and > in user-controlled body fields", () => {
    const out = organizationInviteEmail({
      organizationName: "<script>alert(1)</script>",
      inviterName: "ok",
      role: "admin",
      acceptUrl: "https://x.example/invite/1",
    });
    expect(out.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(out.html).not.toContain("<script>alert(1)</script>");
  });
  it("escapes & quotes ' and backticks", () => {
    const out = organizationInviteEmail({
      organizationName: "Acme & Co",
      inviterName: 'O"Malley',
      role: "it's-admin",
      acceptUrl: "https://x.example/`",
    });
    expect(out.html).toContain("Acme &amp; Co");
    expect(out.html).toContain("O&quot;Malley");
    expect(out.html).toContain("it&#39;s-admin");
    expect(out.html).toContain("&#96;");
  });
  it("text body uses raw values (not HTML-escaped)", () => {
    // Plain-text alternative is rendered as-is by the email client; we
    // intentionally don't HTML-escape it (would surface "&amp;" as literal).
    const out = organizationInviteEmail({
      organizationName: "Acme & Co",
      inviterName: "Jane",
      role: "admin",
      acceptUrl: "https://x.example/invite/1",
    });
    expect(out.text).toContain("Acme & Co");
    expect(out.text).not.toContain("&amp;");
  });
  it("subject line is plain text (raw org name)", () => {
    const out = organizationInviteEmail({
      organizationName: "Acme & Co",
      inviterName: "Jane",
      role: "admin",
      acceptUrl: "https://x.example/",
    });
    expect(out.subject).toContain("Acme & Co");
  });
  it("includes the accept URL escaped in body and raw in text", () => {
    const url = "https://x.example/?q=&a";
    const out = organizationInviteEmail({
      organizationName: "x",
      inviterName: "y",
      role: "admin",
      acceptUrl: url,
    });
    expect(out.html).toContain("https://x.example/?q=&amp;a");
    expect(out.text).toContain(url);
  });
});

describe("ownershipTransferEmail", () => {
  it("escapes user-controlled fields in the body", () => {
    const out = ownershipTransferEmail({
      organizationName: "<b>Org</b>",
      initiatorName: "<b>Boss</b>",
      confirmUrl: "https://x.example/confirm/1",
    });
    expect(out.html).toContain("&lt;b&gt;Org&lt;/b&gt;");
    expect(out.html).toContain("&lt;b&gt;Boss&lt;/b&gt;");
    expect(out.html).not.toContain("<b>Org</b>");
  });
  it("references the canonical TTL constant in body and text", () => {
    const out = ownershipTransferEmail({
      organizationName: "Org",
      initiatorName: "Boss",
      confirmUrl: "https://x.example/confirm/1",
    });
    const ttlMention = `${OWNERSHIP_TRANSFER_TTL_DAYS} days`;
    expect(out.html).toContain(ttlMention);
    expect(out.text).toContain(ttlMention);
  });
  it("subject names both the initiator and the org", () => {
    const out = ownershipTransferEmail({
      organizationName: "Acme",
      initiatorName: "Jane",
      confirmUrl: "https://x.example/",
    });
    expect(out.subject).toContain("Jane");
    expect(out.subject).toContain("Acme");
  });
});
