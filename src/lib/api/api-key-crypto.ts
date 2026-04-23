import { randomBytes, createHash } from "node:crypto";

// "rs_live_" prefix signals a production key. When/if we add sandbox keys
// in Phase 12+ they'd use "rs_test_" — the same hash table can hold both.
export const API_KEY_PREFIX = "rs_live_";
export const API_KEY_PREFIX_LENGTH = 12; // "rs_live_" (8) + 4 random chars

/**
 * Generate a fresh API key. Returns:
 *   - cleartext: the full key, shown to the user ONCE at creation time
 *   - hash:      SHA-256 hex; what we store in ApiKey.hash
 *   - prefix:    first 12 chars of cleartext, stored in ApiKey.prefix for UI
 *
 * 32 bytes of crypto-random entropy → base64url-encoded (43 chars, no padding)
 * → prepended with "rs_live_" (8 chars) → total length 51.
 */
export function generateApiKey(): {
  cleartext: string;
  hash: string;
  prefix: string;
} {
  const entropy = randomBytes(32).toString("base64url");
  const cleartext = `${API_KEY_PREFIX}${entropy}`;
  return {
    cleartext,
    hash: hashApiKey(cleartext),
    prefix: extractKeyPrefix(cleartext),
  };
}

/**
 * SHA-256 the full key, return hex. With 256-bit entropy there's nothing
 * for a KDF to strengthen — the speed of SHA-256 is desirable because it
 * runs on every authed request. Hash comparison happens via an indexed DB
 * equality check, which is effectively constant-time at the DB layer.
 */
export function hashApiKey(cleartext: string): string {
  return createHash("sha256").update(cleartext).digest("hex");
}

/**
 * Extract the first 12 chars of a cleartext key. Safe on short inputs —
 * returns whatever is available. Used for UI display ("key ending in…")
 * and nothing security-sensitive.
 */
export function extractKeyPrefix(cleartext: string): string {
  return cleartext.slice(0, API_KEY_PREFIX_LENGTH);
}
