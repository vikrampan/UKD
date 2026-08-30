import { publicAnnouncement } from "@/server/content";
import { publicJson, preflight } from "@/lib/publicApi";

export const dynamic = "force-dynamic";
export function OPTIONS(req: Request) { return preflight(req); }

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await publicAnnouncement(decodeURIComponent(slug));
  if (!post) return publicJson(req, { error: "यह लेख नहीं मिला।" }, { status: 404 });
  return publicJson(req, { post });
}
