/**
 * Access control.
 *
 * The architecture doc states permission as
 *   Role × Department × Geography × Data Sensitivity
 * and this file is the only place that is resolved. Callers never hand-roll a
 * `where` clause over org-scoped data — they ask for a scope and spread it.
 *
 * Geography works off OrgUnit.path, a materialised path like "party.state.
 * pauri.". "Everything at or below unit X" is then a prefix match, which is a
 * single indexed scan rather than a recursive walk.
 *
 * IMPORTANT: this runs on the server only. The prototype's role switcher hid
 * menu items, which is not access control — the rows were already in the
 * browser. Every read of scoped data must go through `scope()`.
 */
import { Department, RoleKey, Sensitivity } from "@prisma/client";
import type { Grant, OrgUnit } from "@prisma/client";

/** Ascending order of classification. Index = clearance level. */
const SENSITIVITY_ORDER: Sensitivity[] = [
  Sensitivity.PUBLIC,
  Sensitivity.INTERNAL,
  Sensitivity.CONFIDENTIAL,
  Sensitivity.HIGHLY_CONFIDENTIAL,
  Sensitivity.SYSTEM,
];

/** Roles that are not confined to a geographic subtree. */
const UNSCOPED_ROLES = new Set<RoleKey>([
  RoleKey.SUPER_ADMIN,
  RoleKey.TOP_LEADERSHIP,
  RoleKey.CENTRAL_ADMIN,
]);

export type GrantWithUnit = Grant & { orgUnit: OrgUnit | null };

export type Actor = {
  userId: string;
  name: string;
  grants: GrantWithUnit[];
};

/** Everything at or below `level`, e.g. CONFIDENTIAL → PUBLIC..CONFIDENTIAL. */
export function sensitivitiesUpTo(level: Sensitivity): Sensitivity[] {
  return SENSITIVITY_ORDER.slice(0, SENSITIVITY_ORDER.indexOf(level) + 1);
}

/** True if the actor holds any unscoped role — sees the whole organisation. */
export function isUnscoped(actor: Actor): boolean {
  return actor.grants.some(
    (g) => UNSCOPED_ROLES.has(g.role) && !isExpired(g),
  );
}

function isExpired(g: Grant): boolean {
  return g.expiresAt !== null && g.expiresAt.getTime() <= Date.now();
}

function activeGrants(actor: Actor, department?: Department): GrantWithUnit[] {
  return actor.grants.filter(
    (g) => !isExpired(g) && (department === undefined || g.department === department),
  );
}

/** The highest classification this actor may read, optionally per department. */
export function clearanceOf(actor: Actor, department?: Department): Sensitivity {
  const grants = activeGrants(actor, department);
  if (grants.length === 0) return Sensitivity.PUBLIC;
  return grants.reduce<Sensitivity>((best, g) =>
    SENSITIVITY_ORDER.indexOf(g.maxSensitivity) > SENSITIVITY_ORDER.indexOf(best)
      ? g.maxSensitivity
      : best,
    Sensitivity.PUBLIC,
  );
}

/**
 * Path prefixes the actor can see. `null` means unrestricted.
 * Redundant prefixes are dropped — holding both "party." and "party.pauri."
 * reduces to "party.".
 */
export function visiblePaths(actor: Actor, department?: Department): string[] | null {
  if (isUnscoped(actor)) return null;

  const grants = activeGrants(actor, department);
  if (grants.some((g) => g.orgUnitId === null)) return null;

  const paths = grants
    .map((g) => g.orgUnit?.path)
    .filter((p): p is string => typeof p === "string");

  return paths
    .filter((p, _i, all) => !all.some((other) => other !== p && p.startsWith(other)))
    .filter((p, i, all) => all.indexOf(p) === i);
}

export type Scope = {
  /** Spread into a Prisma `where` on any model with orgUnit + sensitivity. */
  where: Record<string, unknown>;
};

/**
 * Build the `where` fragment restricting a query to what this actor may read.
 *
 * Deliberately fails closed: an actor with no live grants gets a filter that
 * matches nothing, rather than an empty filter that would match everything.
 */
export function scope(actor: Actor, opts: { department?: Department } = {}): Scope {
  const paths = visiblePaths(actor, opts.department);
  const allowed = sensitivitiesUpTo(clearanceOf(actor, opts.department));

  if (paths !== null && paths.length === 0) {
    // No geography at all — match nothing. Never return {}.
    return { where: { id: "__no_access__" } };
  }

  const where: Record<string, unknown> = { sensitivity: { in: allowed } };
  if (paths !== null) {
    where.orgUnit = { OR: paths.map((p) => ({ path: { startsWith: p } })) };
  }
  return { where };
}

/** Can the actor act on (not merely read) this org unit? */
export function canActOn(actor: Actor, unitPath: string, department?: Department): boolean {
  const paths = visiblePaths(actor, department);
  if (paths === null) return true;
  return paths.some((p) => unitPath.startsWith(p));
}

/** Guard for approval-type actions. Karyakartas can never approve — doc §3. */
export function canApprove(actor: Actor, department?: Department): boolean {
  return activeGrants(actor, department).some(
    (g) => g.role !== RoleKey.KARYAKARTA,
  );
}
