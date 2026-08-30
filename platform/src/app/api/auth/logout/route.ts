import { NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth";
import { clearSessionCookie, readSessionToken, getActor } from "@/lib/session";
import { record } from "@/lib/audit";

export async function POST(req: Request) {
  const actor = await getActor();
  const token = await readSessionToken();

  if (token) await revokeSession(token);
  await clearSessionCookie();

  if (actor) {
    await record({
      actorId: actor.userId,
      action: "auth.logout",
      entity: "User",
      entityId: actor.userId,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
