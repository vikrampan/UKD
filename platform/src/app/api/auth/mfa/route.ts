/** Step 2 of sign-in: the six-digit TOTP code. */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, verifyMfa } from "@/lib/auth";
import { readChallenge } from "@/lib/challenge";
import { setSessionCookie } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { record } from "@/lib/audit";

const Body = z.object({
  challenge: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "छह अंकों का कोड लिखें।"),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "अमान्य जानकारी।" },
      { status: 400 },
    );
  }

  const userId = readChallenge(parsed.data.challenge);
  if (!userId) {
    return NextResponse.json({ error: "सत्र समाप्त हो गया। दोबारा साइन इन करें।" }, { status: 401 });
  }

  // Budget is per user, not per IP: a stolen challenge shouldn't be brute
  // forceable from a fresh address.
  const limited = rateLimit(`mfa:${userId}`, { limit: 6, windowMs: 5 * 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "बहुत अधिक प्रयास। कुछ देर बाद पुनः प्रयास करें।" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.mfaSecret || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "सत्यापन विफल।" }, { status: 401 });
  }

  if (!verifyMfa(user.mfaSecret, parsed.data.code)) {
    await record({
      actorId: user.id,
      action: "auth.mfa.failed",
      entity: "User",
      entityId: user.id,
      ip,
    });
    return NextResponse.json({ error: "कोड गलत है।" }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user.id, {
    ip,
    userAgent: req.headers.get("user-agent"),
  });
  await setSessionCookie(token, expiresAt);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await record({ actorId: user.id, action: "auth.login.mfa", entity: "User", entityId: user.id, ip });

  return NextResponse.json({ ok: true });
}
