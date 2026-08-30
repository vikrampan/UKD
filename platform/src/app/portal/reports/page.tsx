import Link from "next/link";
import { requireActor } from "@/lib/session";
import { listPeriods, myOutstanding } from "@/server/reports";
import { assignableUnits } from "@/server/people";
import { OpenWeek } from "./open-week";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium" });
const dueFmt = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function ReportsPage() {
  const actor = await requireActor();
  const [periods, outstanding, units] = await Promise.all([
    listPeriods(),
    myOutstanding(actor),
    assignableUnits(actor),
  ]);

  const now = Date.now();
  const overdue = outstanding.filter((r) => r.period.dueAt.getTime() < now);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">रिपोर्ट</h1>
          <p className="text-ukd-mute">साप्ताहिक इकाई रिपोर्ट — समय-सीमा रविवार शाम 6 बजे।</p>
        </div>
        <OpenWeek units={units} />
      </div>

      {overdue.length > 0 && (
        <div className="mb-8 rounded-xl border border-ukd-red/30 bg-ukd-red/5 p-5">
          <p className="font-bold text-ukd-red-dark">
            {overdue.length} इकाइयों की रिपोर्ट समय-सीमा के बाद भी लंबित है
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ukd-red-dark">
            {overdue.map((r) => (
              <li key={r.id}>{r.orgUnit.name} <span className="opacity-70">({r.period.code})</span></li>
            ))}
          </ul>
        </div>
      )}

      {outstanding.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-bold">आपसे अपेक्षित ({outstanding.length})</h2>
          <ul className="grid gap-2">
            {outstanding.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ukd-line bg-white px-4 py-3">
                <span className="font-semibold">{r.orgUnit.name}</span>
                <span className="text-sm text-ukd-mute">
                  {r.period.code} · अंतिम {dueFmt.format(r.period.dueAt)}
                </span>
                <Link href={`/portal/reports/${r.periodId}`}
                  className="ms-auto min-h-9 rounded-lg bg-ukd-green px-3 py-1.5 text-sm font-semibold text-white">
                  भरें
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">अवधियाँ</h2>
        {periods.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ukd-line bg-white p-12 text-center">
            <p className="font-semibold">अभी कोई रिपोर्ट अवधि नहीं खोली गई।</p>
            <p className="mt-1 text-sm text-ukd-mute">
              सप्ताह खोलने पर हर इकाई के लिए रिपोर्ट अपने आप बन जाएगी।
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-ukd-line bg-white">
            {periods.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ukd-line px-4 py-3 last:border-0">
                <Link href={`/portal/reports/${p.id}`} className="font-semibold hover:text-ukd-green">
                  {p.code}
                </Link>
                <span className="text-sm text-ukd-mute">
                  {fmt.format(p.startsOn)} – {fmt.format(p.endsOn)}
                </span>
                <span className="ms-auto text-sm text-ukd-mute tabular-nums">
                  {p._count.reports} इकाइयाँ
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
