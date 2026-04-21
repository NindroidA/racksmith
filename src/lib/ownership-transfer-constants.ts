/**
 * Time-to-live for an ownership-transfer request. If the target doesn't
 * click the confirmation link within this window, the transfer moves to
 * `status: "expired"` and the initiator has to start over.
 *
 * Exported as both milliseconds (for server actions computing expiry
 * dates) and days (for user-facing copy in toasts, emails, and docs).
 * The days value derives from the ms value so updating one keeps the
 * two in sync.
 */
export const OWNERSHIP_TRANSFER_TTL_MS = 3 * 24 * 60 * 60 * 1000;

export const OWNERSHIP_TRANSFER_TTL_DAYS =
  OWNERSHIP_TRANSFER_TTL_MS / (24 * 60 * 60 * 1000);
