import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/session";
import { getTask, allowedTransitions, TRANSITION_LABEL, STATUS_LABEL, parentIsClearable } from "@/server/tasks";
import { transitionAction } from "@/server/actions/tasks";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();

  // Scoped lookup — a task outside the actor's geography 404s rather than
  // revealing that it exists.
  const task = await getTask(actor, id);
  if (!task) notFound();

  let actions = allowedTransitions(actor, task);

  // A cascaded parent can't close while children are open.
  const blockedByChildren =
    task.children.length > 0 && !(await parentIsClearable(task.id));
  if (blockedByChildren) {
    actions = actions.filter((a) => a !== TaskStatus.CLOSED);
  }

  return (
    <>
      <Link href="/portal/tasks" className="text-sm text-ukd-mute hover:text-ukd-green">
        ← सभी कार्य
      </Link>

      <div className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-ukd-mute">{task.code}</p>
          <h1 className="mt-1 text-2xl font-bold">{task.title}</h1>
          <p className="mt-2 text-ukd-mute">
            {task.orgUnit.name} · बनाया: {task.createdBy.name}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {task.description && (
        <p className="mb-8 max-w-2xl whitespace-pre-wrap">{task.description}</p>
      )}

      <dl className="mb-10 grid gap-4 sm:grid-cols-3">
        {[
          ["समय-सीमा", task.dueAt ? new Intl.DateTimeFormat("hi-IN").format(task.dueAt) : "—"],
          ["प्राथमिकता", task.priority],
          ["वर्गीकरण", task.sensitivity],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-ukd-line bg-white p-4">
            <dt className="text-xs font-semibold text-ukd-mute">{k}</dt>
            <dd className="mt-1 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Actions come from the service, so the UI can never offer something
          the transition table would refuse. */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">कार्रवाई</h2>
        {blockedByChildren && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            अधीनस्थ कार्य अभी पूरे नहीं हुए — तब तक यह कार्य बंद नहीं किया जा सकता।
          </p>
        )}
        {actions.length === 0 ? (
          <p className="text-ukd-mute">इस समय आपके लिए कोई कार्रवाई उपलब्ध नहीं है।</p>
        ) : (
          <form action={transitionAction} className="grid max-w-xl gap-3">
            <input type="hidden" name="taskId" value={task.id} />
            <input
              name="note"
              placeholder="टिप्पणी (वैकल्पिक)"
              className="min-h-11 rounded-lg border border-ukd-line bg-white px-3 outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20"
            />
            <div className="flex flex-wrap gap-2">
              {actions.map((to) => (
                <button
                  key={to}
                  name="to"
                  value={to}
                  className={`min-h-11 rounded-lg px-4 font-semibold ${
                    to === TaskStatus.REJECTED || to === TaskStatus.CORRECTION_REQUIRED
                      ? "border border-ukd-red text-ukd-red hover:bg-ukd-red/5"
                      : "bg-ukd-green text-white"
                  }`}
                >
                  {TRANSITION_LABEL[to]}
                </button>
              ))}
            </div>
          </form>
        )}
      </section>

      {task.children.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-bold">
            अधीनस्थ कार्य ({task.children.length})
          </h2>
          <ul className="divide-y divide-ukd-line overflow-hidden rounded-xl border border-ukd-line bg-white">
            {task.children.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link href={`/portal/tasks/${c.id}`} className="font-semibold hover:text-ukd-green">
                  {c.orgUnit.name}
                </Link>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">गतिविधि</h2>
        <ol className="divide-y divide-ukd-line overflow-hidden rounded-xl border border-ukd-line bg-white">
          {task.events.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <p className="text-sm">
                <span className="font-semibold">{e.actor.name}</span>
                {" — "}
                {e.from ? `${STATUS_LABEL[e.from]} → ${STATUS_LABEL[e.to]}` : STATUS_LABEL[e.to]}
              </p>
              {e.note && <p className="mt-1 text-sm text-ukd-mute">{e.note}</p>}
              <p className="mt-1 text-xs text-ukd-mute tabular-nums">{dateFmt.format(e.at)}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
