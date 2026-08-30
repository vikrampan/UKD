/**
 * Org-tree helpers. The materialised `path` is the load-bearing column: RBAC
 * scoping, subtree counts and task cascade are all prefix matches on it.
 */
import { db } from "@/lib/db";
import type { OrgUnit, OrgUnitType } from "@prisma/client";

/** Child path = parent path + own id + "." Root units are "<id>." */
export function childPath(parentPath: string | null, id: string): string {
  return parentPath ? `${parentPath}${id}.` : `${id}.`;
}

export async function createUnit(input: {
  type: OrgUnitType;
  name: string;
  nameHi?: string;
  parentId?: string | null;
}): Promise<OrgUnit> {
  const parent = input.parentId
    ? await db.orgUnit.findUniqueOrThrow({ where: { id: input.parentId } })
    : null;

  // Two steps because the path contains the row's own id, which Postgres
  // assigns on insert. Same transaction, so a failure leaves nothing behind.
  return db.$transaction(async (tx) => {
    const created = await tx.orgUnit.create({
      data: {
        type: input.type,
        name: input.name,
        nameHi: input.nameHi ?? null,
        parentId: parent?.id ?? null,
        path: "",
        depth: parent ? parent.depth + 1 : 0,
      },
    });
    return tx.orgUnit.update({
      where: { id: created.id },
      data: { path: childPath(parent?.path ?? null, created.id) },
    });
  });
}

/** The unit and everything beneath it. */
export function subtree(unit: Pick<OrgUnit, "path">) {
  return db.orgUnit.findMany({
    where: { path: { startsWith: unit.path } },
    orderBy: [{ depth: "asc" }, { name: "asc" }],
  });
}

/** Direct children only — what the org browser renders one level at a time. */
export function childrenOf(unitId: string | null) {
  return db.orgUnit.findMany({
    where: { parentId: unitId, isActive: true },
    orderBy: { name: "asc" },
  });
}
