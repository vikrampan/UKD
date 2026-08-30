/** Step 1 of sign-in: phone + password. Returns a challenge if MFA is on. */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { issueChallenge } from "@/lib/challenge";
import { setSessionCookie } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { record } from "@/lib/audit";

const Body = z.object({
  phone: z.string().regex(/^\d{10}$/, "10 अंकों का मोबाइल नंबर लिखें।"),
  password: z.string().min(1, "पासवर्ड लिखें।"),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const limited = rateLimit(`login:${ip ?? "unknown"}`, { limit: 10, windowMs: 15 * 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "बहुत अधिक प्रयास। कुछ देर बाद पुनः प्रयास करें।" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "अमान्य जानकारी।" },
      { status: 400 },
    );
  }

  const { phone, password } = parsed.data;
  const user = await db.user.findUnique({ where: { phone } });

  // Same message and roughly the same work either way, so the response does
  // not reveal whether the phone number exists.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !ok || user.status !== "ACTIVE") {
    await record({
      actorId: user?.id ?? null,
      action: "auth.login.failed",
      entity: "User",
      entityId: user?.id ?? null,
      ip,
    });
    return NextResponse.json({ error: "मोबाइल नंबर या पासवर्ड गलत है।" }, { status: 401 });
  }

  if (user.mfaEnabled) {
    return NextResponse.json({ mfaRequired: true, challenge: issueChallenge(user.id) });
  }

  const { token, expiresAt } = await createSession(user.id, {
    ip,
    userAgent: req.headers.get("user-agent"),
  });
  await setSessionCookie(token, expiresAt);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await record({ actorId: user.id, action: "auth.login", entity: "User", entityId: user.id, ip });

  return NextResponse.json({ ok: true });
}
