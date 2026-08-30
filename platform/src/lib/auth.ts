/**
 * Authentication: passwords, sessions, TOTP (doc §32).
 *
 * Session tokens are random 32-byte values. Only their SHA-256 hash is
 * stored, so a database leak does not hand over live sessions.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { generateSecret, generateURI, verifySync } from "otplib";
import { db } from "@/lib/db";
import type { Actor, GrantWithUnit } from "@/lib/rbac";

const SESSION_DAYS = 7;
const BCRYPT_ROUNDS = 12;

/* ── passwords ── */

/** Doc §32 "strong password policy", enforced server-side. */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return "पासवर्ड कम से कम 12 अक्षरों का होना चाहिए।";
  if (!/[a-z]/.test(password)) return "पासवर्ड में एक छोटा अक्षर होना चाहिए।";
  if (!/[A-Z]/.test(password)) return "पासवर्ड में एक बड़ा अक्षर होना चाहिए।";
  if (!/[0-9]/.test(password)) return "पासवर्ड में एक अंक होना चाहिए।";
  return null;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/* ── sessions ── */

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/** Resolve a raw session token to an Actor, or null. Also loads grants. */
export async function actorFromToken(token: string | undefined): Promise<Actor | null> {
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: { include: { grants: { include: { orgUnit: true } } } },
    },
  });

  if (!session) return null;
  if (session.revokedAt !== null) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (session.user.status !== "ACTIVE") return null;

  return {
    userId: session.user.id,
    name: session.user.name,
    grants: session.user.grants as GrantWithUnit[],
  };
}

export async function revokeSession(token: string): Promise<void> {
  await db.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Doc §32 device/session management — used by "sign out everywhere". */
export async function revokeAllSessions(userId: string): Promise<number> {
  const { count } = await db.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return count;
}

/* ── TOTP ── */

export function newMfaSecret(): string {
  return generateSecret();
}

export function mfaUri(secret: string, account: string): string {
  return generateURI({
    strategy: "totp",
    issuer: "उत्तराखंड क्रांति दल",
    label: account,
    secret,
  });
}

export function verifyMfa(secret: string, token: string): boolean {
  const clean = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  try {
    // 30s either side — one TOTP step — so a code entered as it rolls over
    // still passes.
    const result = verifySync({ secret, token: clean, epochTolerance: 30 });
    return typeof result === "boolean" ? result : Boolean(result?.valid);
  } catch {
    return false;
  }
}

/** Constant-time compare for any secret we check by equality. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
