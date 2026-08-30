/**
 * Short-lived MFA challenge.
 *
 * Between the password step and the TOTP step we need to remember "this phone
 * already passed its password" without trusting the client. A signed, expiring
 * token does that with no database row and no server state.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 5 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueChallenge(userId: string): string {
  const payload = `${userId}.${Date.now() + TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns the userId, or null if forged, malformed or expired. */
export function readChallenge(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, expiresAt, mac] = parts;
  const expected = sign(`${userId}.${expiresAt}`);

  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (Number(expiresAt) <= Date.now()) return null;
  return userId;
}
