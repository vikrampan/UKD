import Link from "next/link";
import { requireActor } from "@/lib/session";
import { listTasks } from "@/server/tasks";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const actor = await requireActor();
  const tasks = await listTasks(actor);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">कार्य</h1>
          <p className="text-ukd-mute">आपके अधिकार क्षेत्र के सभी कार्य।</p>
        </div>
        <Link
          href="/portal/tasks/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-ukd-green px-4 font-semibold text-white"
        >
          नया कार्य
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ukd-line bg-white p-12 text-center">
          <p className="font-semibold">अभी कोई कार्य नहीं है।</p>
          <p className="mt-1 text-sm text-ukd-mute">
            नया कार्य बनाएँ — और चाहें तो उसे सभी अधीनस्थ इकाइयों में भेजें।
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ukd-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-ukd-line text-left text-ukd-mute">
              <tr>
                <th className="px-4 py-3 font-semibold">क्रमांक</th>
                <th className="px-4 py-3 font-semibold">कार्य</th>
                <th className="px-4 py-3 font-semibold">इकाई</th>
                <th className="px-4 py-3 font-semibold">स्थिति</th>
                <th className="px-4 py-3 font-semibold">समय-सीमा</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-ukd-line last:border-0 hover:bg-ukd-paper">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ukd-mute">
                    {t.code}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/portal/tasks/${t.id}`} className="font-semibold hover:text-ukd-green">
                      {t.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{t.orgUnit.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ukd-mute">
                    {t.dueAt ? new Intl.DateTimeFormat("hi-IN").format(t.dueAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
