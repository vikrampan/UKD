/**
 * Public grievance intake. No authentication by design — any citizen of
 * Uttarakhand can file one. Rate limited, and it stores only what is needed
 * to route and resolve.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { submitIssue } from "@/server/issues";
import { rateLimit } from "@/lib/ratelimit";

const CATEGORIES = [
  "सड़क व संपर्क", "पानी", "बिजली", "स्वास्थ्य", "शिक्षा", "रोज़गार",
  "परिवहन", "स्थानीय प्रशासन", "पर्यावरण", "आपदा संबंधी", "अन्य",
] as const;

const Body = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().trim().min(6, "समस्या का शीर्षक कम से कम 6 अक्षरों का हो।"),
  details: z.string().trim().min(20, "समस्या कम से कम 20 अक्षरों में लिखें।"),
  citizenName: z.string().trim().min(2, "अपना नाम लिखें।"),
  citizenPhone: z.string().regex(/^\d{10}$/, "10 अंकों का मोबाइल नंबर लिखें।"),
  locality: z.string().trim().optional(),
  district: z.string().trim().min(1, "अपना ज़िला चुनें।"),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const limited = rateLimit(`issue:${ip ?? "unknown"}`, { limit: 5, windowMs: 60 * 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "बहुत अधिक अनुरोध। कुछ देर बाद पुनः प्रयास करें।" },
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

  const { district, ...rest } = parsed.data;
  const unit = await db.orgUnit.findFirst({
    where: { name: district, type: "DISTRICT", isActive: true },
  });
  if (!unit) {
    return NextResponse.json({ error: "यह ज़िला मान्य नहीं है।" }, { status: 400 });
  }

  const issue = await submitIssue({ ...rest, orgUnitId: unit.id, ip });

  // The code is the citizen's only handle on this — return it prominently.
  return NextResponse.json({ code: issue.code }, { status: 201 });
}

/** Districts for the form's dropdown. */
export async function GET() {
  const districts = await db.orgUnit.findMany({
    where: { type: "DISTRICT", isActive: true },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    districts: districts.map((d) => d.name),
    categories: CATEGORIES,
  });
}
