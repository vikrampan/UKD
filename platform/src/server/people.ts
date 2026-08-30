/**
 * Karyakarta and office-bearer management.
 *
 * Creating a person is really three things at once: an account, a profile
 * against an org unit, and at least one grant. They are created in one
 * transaction because a user with no grant can sign in and see nothing,
 * which looks like a broken system rather than a permissions problem.
 */
import { randomBytes } from "node:crypto";
import { Department, RoleKey, Sensitivity, UserStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordIn } from "@/lib/audit";
import { canActOn, scopeGeo, visiblePaths, type Actor } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { Forbidden } from "@/server/tasks";

export const ROLE_LABEL: Record<RoleKey, string> = {
  SUPER_ADMIN: "प्रधान प्रशासक",
  TOP_LEADERSHIP: "शीर्ष नेतृत्व",
  CENTRAL_ADMIN: "केंद्रीय प्रशासक",
  STATE_ADMIN: "राज्य प्रशासक",
  DISTRICT_ADMIN: "ज़िला प्रशासक",
  BLOCK_COORDINATOR: "ब्लॉक संयोजक",
  UNIT_COORDINATOR: "इकाई संयोजक",
  KARYAKARTA: "कार्यकर्ता",
  IT_CELL: "आईटी प्रकोष्ठ",
  ERP_CELL: "ईआरपी प्रकोष्ठ",
  COMMS_CELL: "संचार प्रकोष्ठ",
};

export const DEPARTMENT_LABEL: Record<Department, string> = {
  ORGANISATION: "संगठन",
  IT: "आईटी",
  ERP: "ईआरपी",
  COMMUNICATIONS: "संचार",
  FINANCE: "वित्त",
  TRAINING: "प्रशिक्षण",
  ADMIN: "प्रशासन",
};

/**
 * Roles an actor may hand out. Nobody grants a role they do not themselves
 * hold — otherwise a district admin could mint a super admin and escalate.
 */
const RANK: RoleKey[] = [
  RoleKey.SUPER_ADMIN,
  RoleKey.TOP_LEADERSHIP,
  RoleKey.CENTRAL_ADMIN,
  RoleKey.STATE_ADMIN,
  RoleKey.DISTRICT_ADMIN,
  RoleKey.BLOCK_COORDINATOR,
  RoleKey.UNIT_COORDINATOR,
  RoleKey.KARYAKARTA,
];

export function grantableRoles(actor: Actor): RoleKey[] {
  const best = Math.min(
    ...actor.grants.map((g) => {
      const i = RANK.indexOf(g.role);
      return i === -1 ? RANK.length : i;
    }),
  );
  if (best >= RANK.length) return [];
  // Strictly below the actor's own rank, plus the cells.
  return [
    ...RANK.slice(best + 1),
    RoleKey.IT_CELL,
    RoleKey.ERP_CELL,
    RoleKey.COMMS_CELL,
  ];
}

export function listPeople(actor: Actor) {
  const { where } = scopeGeo(actor);
  return db.karyakarta.findMany({
    where,
    include: {
      orgUnit: true,
      user: { include: { grants: { include: { orgUnit: true } } } },
    },
    orderBy: { joinedAt: "desc" },
  });
}

export async function getPerson(actor: Actor, id: string) {
  const { where } = scopeGeo(actor);
  return db.karyakarta.findFirst({
    where: { ...where, id },
    include: {
      orgUnit: true,
      user: { include: { grants: { include: { orgUnit: true } } } },
    },
  });
}

/** Human-friendly temporary password — shown once, then rotated on first use. */
function temporaryPassword(): string {
  return `Ukd${randomBytes(4).toString("hex")}A1`;
}

export async function invitePerson(
  actor: Actor,
  input: {
    name: string;
    phone: string;
    orgUnitId: string;
    role: RoleKey;
    department?: Department;
    responsibilities?: string;
  },
): Promise<{ code: string; temporaryPassword: string }> {
  const unit = await db.orgUnit.findUniqueOrThrow({ where: { id: input.orgUnitId } });
  if (!canActOn(actor, unit.path)) throw new Forbidden();
  if (!grantableRoles(actor).includes(input.role)) {
    throw new Forbidden("आप यह भूमिका नहीं दे सकते।");
  }

  const existing = await db.user.findUnique({ where: { phone: input.phone } });
  if (existing) throw new Forbidden("यह मोबाइल नंबर पहले से पंजीकृत है।");

  const password = temporaryPassword();
  const hash = await hashPassword(password);

  const code = await db.$transaction(
    async (tx) => {
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('org.karyakarta_code_seq')
      `;
      const code = `UKD-K-${String(nextval).padStart(5, "0")}`;

      const user = await tx.user.create({
        data: {
          name: input.name,
          phone: input.phone,
          passwordHash: hash,
          status: UserStatus.ACTIVE,
          mustChangePassword: true,
        },
      });

      await tx.karyakarta.create({
        data: {
          userId: user.id,
          orgUnitId: unit.id,
          code,
          responsibilities: input.responsibilities ?? null,
        },
      });

      await tx.grant.create({
        data: {
          userId: user.id,
          role: input.role,
          department: input.department ?? Department.ORGANISATION,
          orgUnitId: unit.id,
          // Invited accounts start at INTERNAL. Raising clearance is a
          // separate, deliberate act.
          maxSensitivity: Sensitivity.INTERNAL,
        },
      });

      await recordIn(tx, {
        actorId: actor.userId,
        action: "person.invite",
        entity: "User",
        entityId: user.id,
        after: { name: input.name, role: input.role, orgUnitId: unit.id, code },
      });

      return code;
    },
    { timeout: 20_000, maxWait: 10_000 },
  );

  return { code, temporaryPassword: password };
}

/** Units an actor may place someone into. */
export async function assignableUnits(actor: Actor) {
  const paths = visiblePaths(actor);
  return db.orgUnit.findMany({
    where: {
      isActive: true,
      ...(paths ? { OR: paths.map((p) => ({ path: { startsWith: p } })) } : {}),
    },
    orderBy: [{ depth: "asc" }, { name: "asc" }],
    select: { id: true, name: true, depth: true },
  });
}

export async function setActive(actor: Actor, karyakartaId: string, active: boolean) {
  const person = await getPerson(actor, karyakartaId);
  if (!person) throw new Forbidden();

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.karyakarta.update({ where: { id: person.id }, data: { isActive: active } });
    await tx.user.update({
      where: { id: person.userId },
      data: { status: active ? UserStatus.ACTIVE : UserStatus.SUSPENDED },
    });
    // Suspending must end live sessions, or the person keeps their access
    // until the cookie happens to expire.
    if (!active) {
      await tx.session.updateMany({
        where: { userId: person.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await recordIn(tx, {
      actorId: actor.userId,
      action: active ? "person.reactivate" : "person.suspend",
      entity: "User",
      entityId: person.userId,
    });
  });
}
