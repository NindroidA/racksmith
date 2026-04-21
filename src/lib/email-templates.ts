import { OWNERSHIP_TRANSFER_TTL_DAYS } from "./ownership-transfer-constants";

const BRAND = "RackSmith";

// Minimal HTML-attribute/text escape. User-controlled inputs (org name,
// inviter name) flow into these templates — escape to prevent XSS in the
// rendered email body.
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
}
const WRAP = (body: string) => `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff;">
  <div style="max-width:520px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;">
    <div style="font-size:20px;font-weight:700;background:linear-gradient(90deg,#3b82f6,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:24px;">${BRAND}</div>
    ${body}
  </div>
  <div style="max-width:520px;margin:16px auto 0;text-align:center;color:#64748b;font-size:12px;">
    ${BRAND} · <a href="https://racksmith.local" style="color:#64748b;text-decoration:underline;">racksmith.local</a>
  </div>
</body>
</html>`;

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: `Reset your ${BRAND} password`,
    html: WRAP(`
      <h1 style="font-size:22px;margin:0 0 12px;">Reset your password</h1>
      <p style="color:#cbd5e1;line-height:1.6;margin:0 0 24px;">
        Click the button below to choose a new password. This link expires in 1 hour.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:500;">Reset password</a>
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:24px 0 0;">
        If you didn't request this, ignore this email — your password stays the same.
      </p>
      <p style="color:#64748b;font-size:12px;word-break:break-all;margin:16px 0 0;">${resetUrl}</p>
    `),
    text: `Reset your ${BRAND} password\n\nOpen this link to choose a new password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  };
}

export function verificationEmail(verifyUrl: string) {
  return {
    subject: `Verify your ${BRAND} email`,
    html: WRAP(`
      <h1 style="font-size:22px;margin:0 0 12px;">Welcome to ${BRAND}</h1>
      <p style="color:#cbd5e1;line-height:1.6;margin:0 0 24px;">
        Click the button to confirm your email address.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:500;">Verify email</a>
      <p style="color:#64748b;font-size:12px;word-break:break-all;margin:24px 0 0;">${verifyUrl}</p>
    `),
    text: `Welcome to ${BRAND}\n\nConfirm your email:\n${verifyUrl}`,
  };
}

export function organizationInviteEmail(input: {
  organizationName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}) {
  const organizationName = escapeHtml(input.organizationName);
  const inviterName = escapeHtml(input.inviterName);
  const role = escapeHtml(input.role);
  const acceptUrl = escapeHtml(input.acceptUrl);
  return {
    subject: `You're invited to ${input.organizationName} on ${BRAND}`,
    html: WRAP(`
      <h1 style="font-size:22px;margin:0 0 12px;">You're invited to ${organizationName}</h1>
      <p style="color:#cbd5e1;line-height:1.6;margin:0 0 20px;">
        <strong style="color:#fff;">${inviterName}</strong> invited you to join
        <strong style="color:#fff;">${organizationName}</strong> as
        <strong style="color:#fff;">${role}</strong>.
      </p>
      <a href="${acceptUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:500;">Accept invitation</a>
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:24px 0 0;">
        This invitation expires in 7 days. If you didn't expect this, you can ignore this email.
      </p>
      <p style="color:#64748b;font-size:12px;word-break:break-all;margin:16px 0 0;">${acceptUrl}</p>
    `),
    text: `You're invited to ${input.organizationName} on ${BRAND}\n\n${input.inviterName} invited you to join ${input.organizationName} as ${input.role}.\n\nAccept: ${input.acceptUrl}\n\nExpires in 7 days. If you didn't expect this, ignore this email.`,
  };
}

export function ownershipTransferEmail(input: {
  organizationName: string;
  initiatorName: string;
  confirmUrl: string;
}) {
  const organizationName = escapeHtml(input.organizationName);
  const initiatorName = escapeHtml(input.initiatorName);
  const confirmUrl = escapeHtml(input.confirmUrl);
  return {
    subject: `${input.initiatorName} wants to make you the owner of ${input.organizationName}`,
    html: WRAP(`
      <h1 style="font-size:22px;margin:0 0 12px;">Ownership transfer</h1>
      <p style="color:#cbd5e1;line-height:1.6;margin:0 0 20px;">
        <strong style="color:#fff;">${initiatorName}</strong> is transferring
        ownership of <strong style="color:#fff;">${organizationName}</strong> to you.
        If you accept, you become the owner with full control — including
        billing, member management, and the ability to delete the organization.
        ${initiatorName} will be demoted to admin.
      </p>
      <a href="${confirmUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:500;">Confirm transfer</a>
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:24px 0 0;">
        This handoff expires in ${OWNERSHIP_TRANSFER_TTL_DAYS} days. If you didn't expect this, ignore the
        email — nothing changes until you confirm.
      </p>
      <p style="color:#64748b;font-size:12px;word-break:break-all;margin:16px 0 0;">${confirmUrl}</p>
    `),
    text: `${input.initiatorName} wants to make you the owner of ${input.organizationName} on ${BRAND}.\n\nIf you accept, you become the owner with full control. ${input.initiatorName} will be demoted to admin.\n\nConfirm: ${input.confirmUrl}\n\nExpires in ${OWNERSHIP_TRANSFER_TTL_DAYS} days. If unexpected, ignore this email.`,
  };
}
