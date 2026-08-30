import { requireActor } from "@/lib/session";
import { db } from "@/lib/db";
import { scope } from "@/lib/rbac";
import { NewTaskForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const actor = await requireActor();

  // Units the actor may act on. scope() filters on the orgUnit relation, so
  // for OrgUnit itself we reuse only the path clause.
  const { where } = scope(actor);
  const unitFilter = (where.orgUnit as { OR?: unknown[] } | undefined)?.OR;

  const units = await db.orgUnit.findMany({
    where: { isActive: true, ...(unitFilter ? { OR: unitFilter as object[] } : {}) },
    orderBy: [{ depth: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, depth: true },
  });

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">नया कार्य</h1>
      <p className="mb-8 text-ukd-mute">
        कार्य किसी इकाई को सौंपें। चाहें तो वही कार्य उसकी सभी अधीनस्थ इकाइयों में भी भेजा जा सकता है।
      </p>
      <NewTaskForm units={units} />
    </>
  );
}
