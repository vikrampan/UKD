import { requireActor } from "@/lib/session";
import { listTasks } from "@/server/tasks";
import { TaskStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await requireActor();

  // Every count below is already scoped — listTasks applies RBAC.
  const [open, mine, review] = await Promise.all([
    listTasks(actor, { status: TaskStatus.ASSIGNED }),
    listTasks(actor, { ownedByMe: true }),
    listTasks(actor, { status: TaskStatus.UNDER_REVIEW }),
  ]);

  const tiles = [
    { label: "नए कार्य", value: open.length },
    { label: "मेरे कार्य", value: mine.length },
    { label: "समीक्षाधीन", value: review.length },
  ];

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">नमस्ते, {actor.name}</h1>
      <p className="mb-8 text-ukd-mute">आपके अधिकार क्षेत्र का सारांश।</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-ukd-line bg-white p-6">
            <div className="text-3xl font-bold text-ukd-green tabular-nums">{t.value}</div>
            <div className="mt-1 text-sm font-semibold text-ukd-mute">{t.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}
