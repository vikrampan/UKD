/**
 * MFA enrolment. GET issues a secret and QR; POST confirms with a live code.
 * The secret is only persisted once a correct code proves the authenticator
 * actually holds it — otherwise a failed setup locks the user out.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { newMfaSecret, mfaUri, verifyMfa } from "@/lib/auth";
import { getActor } from "@/lib/session";
import { record } from "@/lib/audit";

export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "प्रमाणीकरण आवश्यक है।" }, { status: 401 });

  const user = await db.user.findUniqueOrThrow({ where: { id: actor.userId } });
  if (user.mfaEnabled) return NextResponse.json({ enabled: true });

  // Stored but not enabled: the account still signs in with a password alone
  // until POST confirms a working code.
  const secret = user.mfaSecret ?? newMfaSecret();
  if (!user.mfaSecret) {
    await db.user.update({ where: { id: user.id }, data: { mfaSecret: secret } });
  }

  const uri = mfaUri(secret, user.phone);
  return NextResponse.json({
    enabled: false,
    secret,
    qr: await QRCode.toDataURL(uri, { margin: 1, width: 240 }),
  });
}

const Body = z.object({ code: z.string().regex(/^\d{6}$/, "छह अंकों का कोड लिखें।") });

export async function POST(req: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "प्रमाणीकरण आवश्यक है।" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: actor.userId } });
  if (!user.mfaSecret) {
    return NextResponse.json({ error: "पहले सेटअप शुरू करें।" }, { status: 400 });
  }
  if (!verifyMfa(user.mfaSecret, parsed.data.code)) {
    return NextResponse.json({ error: "कोड गलत है। दोबारा प्रयास करें।" }, { status: 401 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { mfaEnabled: true, mfaVerifiedAt: new Date() },
  });
  await record({ actorId: user.id, action: "auth.mfa.enable", entity: "User", entityId: user.id });

  return NextResponse.json({ ok: true });
}

/** Turn MFA off. Requires a current code, so a borrowed session can't do it. */
export async function DELETE(req: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "प्रमाणीकरण आवश्यक है।" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "बंद करने के लिए वर्तमान कोड आवश्यक है।" }, { status: 400 });
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: actor.userId } });
  if (!user.mfaSecret || !verifyMfa(user.mfaSecret, parsed.data.code)) {
    return NextResponse.json({ error: "कोड गलत है।" }, { status: 401 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { mfaEnabled: false, mfaSecret: null, mfaVerifiedAt: null },
  });
  await record({ actorId: user.id, action: "auth.mfa.disable", entity: "User", entityId: user.id });

  return NextResponse.json({ ok: true });
}
