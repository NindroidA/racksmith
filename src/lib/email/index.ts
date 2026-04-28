// Barrel for the email module. Call sites import from `@/lib/email` and
// get the transport (`sendEmail`) plus every template helper. Splitting
// the directory into `client.ts` (Resend transport + dev-mode logging)
// and `templates.ts` (escaped HTML/text bodies) was a structural fix —
// pre-split, both lived in two top-level files (`email.ts`,
// `email-templates.ts`) which was the only multi-file `lib/` group not
// already in a directory.
export { sendEmail } from "./client";
export {
  organizationInviteEmail,
  ownershipTransferEmail,
  passwordResetEmail,
  verificationEmail,
} from "./templates";
