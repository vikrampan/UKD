/**
 * CORS for the public grievance endpoints.
 *
 * The public site is a separate origin until it moves into this app, so the
 * browser preflights these calls. Only the public issue routes use this —
 * everything under /portal and /api/auth stays same-origin and cookie-bound.
 */
const ALLOWED = (process.env.PUBLIC_SITE_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(origin: string | null): Record<string, string> {
  // Echo the origin only when it is on the allowlist; never reflect blindly.
  if (!origin || !ALLOWED.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Access-Control-Max-Age": "86400",
  };
}

export function preflight(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}
