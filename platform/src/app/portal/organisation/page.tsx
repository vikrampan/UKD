import { requireActor } from "@/lib/session";
import { db } from "@/lib/db";
import { scope } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  PARTY: "दल", STATE: "राज्य", REGION: "क्षेत्र", DISTRICT: "ज़िला",
  ASSEMBLY: "विधानसभा", BLOCK: "ब्लॉक", LOCAL_UNIT: "स्थानीय इकाई", BOOTH: "बूथ",
};

export default async function OrganisationPage() {
  const actor = await requireActor();

  const { where } = scope(actor);
  const geo = (where.orgUnit as { OR?: object[] } | undefined)?.OR;

  const units = await db.orgUnit.findMany({
    where: { isActive: true, ...(geo ? { OR: geo } : {}) },
    orderBy: [{ depth: "asc" }, { name: "asc" }],
    include: { _count: { select: { karyakartas: true, tasks: true, issues: true } } },
  });

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">संगठन</h1>
      <p className="mb-8 text-ukd-mute">
        केंद्र से इकाई तक — आपके अधिकार क्षेत्र का ढाँचा।
      </p>

      <ul className="overflow-hidden rounded-xl border border-ukd-line bg-white">
        {units.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ukd-line px-4 py-3 last:border-0"
            style={{ paddingInlineStart: `${16 + u.depth * 20}px` }}
          >
            <span className="font-semibold">{u.name}</span>
            <span className="rounded-full bg-ukd-paper px-2 py-0.5 text-xs text-ukd-mute">
              {TYPE_LABEL[u.type] ?? u.type}
            </span>
            <span className="ms-auto flex gap-4 text-xs text-ukd-mute tabular-nums">
              <span>कार्यकर्ता {u._count.karyakartas}</span>
              <span>कार्य {u._count.tasks}</span>
              <span>समस्याएँ {u._count.issues}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
