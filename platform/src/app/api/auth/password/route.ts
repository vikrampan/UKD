/** Change own password. Also clears the forced-rotation flag. */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword, revokeAllSessions, createSession } from "@/lib/auth";
import { getActor, setSessionCookie } from "@/lib/session";
import { record } from "@/lib/audit";

const Body = z.object({
  current: z.string().min(1, "वर्तमान पासवर्ड लिखें।"),
  next: z.string().min(1, "नया पासवर्ड लिखें।"),
});

export async function POST(req: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "प्रमाणीकरण आवश्यक है।" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const problem = passwordProblem(parsed.data.next);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const user = await db.user.findUniqueOrThrow({ where: { id: actor.userId } });
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) {
    return NextResponse.json({ error: "वर्तमान पासवर्ड गलत है।" }, { status: 401 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.next), mustChangePassword: false },
  });

  // Everything else signs out — a password change should evict any session
  // opened with the old one. Then re-issue for the device doing the change.
  await revokeAllSessions(user.id);
  const { token, expiresAt } = await createSession(user.id, {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: req.headers.get("user-agent"),
  });
  await setSessionCookie(token, expiresAt);

  await record({ actorId: user.id, action: "auth.password.change", entity: "User", entityId: user.id });
  return NextResponse.json({ ok: true });
}
