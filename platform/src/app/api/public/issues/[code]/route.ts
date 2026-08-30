/** Citizen tracking by code. Returns status only — never internal fields. */
import { NextResponse } from "next/server";
import { trackIssue } from "@/server/issues";
import { rateLimit } from "@/lib/ratelimit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  // Codes are sequential and therefore guessable; throttle enumeration.
  const limited = rateLimit(`track:${ip ?? "unknown"}`, { limit: 30, windowMs: 10 * 60_000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "बहुत अधिक अनुरोध।" }, { status: 429 });
  }

  const { code } = await params;
  const issue = await trackIssue(code);

  if (!issue) {
    return NextResponse.json(
      { error: "इस क्रमांक से कोई समस्या दर्ज नहीं मिली।" },
      { status: 404 },
    );
  }
  return NextResponse.json({ issue });
}
