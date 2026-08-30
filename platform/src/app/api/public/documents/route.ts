import { publicDocuments } from "@/server/content";
import { publicJson, preflight } from "@/lib/publicApi";

export const dynamic = "force-dynamic";
export function OPTIONS(req: Request) { return preflight(req); }

export async function GET(req: Request) {
  return publicJson(req, { documents: await publicDocuments() });
}
