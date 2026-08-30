import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";

/** Shared shape for the read-only public endpoints the website consumes. */
export function publicJson(req: Request, body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders(req.headers.get("origin")),
      // Short cache: the site is read-mostly, but an edit should surface fast.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      ...(init.headers ?? {}),
    },
  });
}

export { preflight };
