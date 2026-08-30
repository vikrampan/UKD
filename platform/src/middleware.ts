import { NextResponse, type NextRequest } from "next/server";

/**
 * Server components can't read the current path, so pass it through as a
 * header. The portal layout uses it to let the forced password-change page
 * render while redirecting everything else.
 */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/portal/:path*" };
