/**
 * Session cookie handling and the server-side `requireActor` guard.
 * Every route handler and server component that touches scoped data starts
 * here — there is no client-trusted identity anywhere in the system.
 */
import { cookies } from "next/headers";
import { actorFromToken } from "@/lib/auth";
import type { Actor } from "@/lib/rbac";

export const SESSION_COOKIE = "ukd_session";

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function readSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}

/** Current actor, or null when signed out. */
export async function getActor(): Promise<Actor | null> {
  return actorFromToken(await readSessionToken());
}

export class Unauthorised extends Error {
  constructor() {
    super("प्रमाणीकरण आवश्यक है");
    this.name = "Unauthorised";
  }
}

/** Use in any handler that must not run anonymously. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new Unauthorised();
  return actor;
}
