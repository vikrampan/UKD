import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/session";
import { periodCompliance } from "@/server/reports";
import { SubmitReport } from "./submit";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function PeriodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();

  const data = await periodCompliance(actor, id);
  if (!data) notFound();

  const { period, rows } = data;
  const pending = rows.filter((r) => r.status === "PENDING");
  const submitted = rows.filter((r) => r.status === "SUBMITTED");
  const late = submitted.filter((r) => r.late);

  const totals = submitted.reduce(
    (a, r) => ({
      meetings: a.meetings + (r.meetings ?? 0),
      activities: a.activities + (r.activities ?? 0),
      newMembers: a.newMembers + (r.newMembers ?? 0),
    }),
    { meetings: 0, activities: 0, newMembers: 0 },
  );

  return (
    <>
      <Link href="/portal/reports" className="text-sm text-ukd-mute hover:text-ukd-green">
        ← सभी अवधियाँ
      </Link>

      <h1 className="mt-4 text-2xl font-bold">{period.code}</h1>
      <p className="mt-1 text-ukd-mute">अंतिम तिथि {fmt.format(period.dueAt)}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          ["जमा", `${submitted.length}/${rows.length}`, "text-ukd-green"],
          ["लंबित", pending.length, pending.length > 0 ? "text-ukd-red" : "text-ukd-green"],
          ["विलंब से जमा", late.length, late.length > 0 ? "text-amber-700" : "text-ukd-green"],
          ["कुल बैठकें", totals.meetings, "text-ukd-ink"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-xl border border-ukd-line bg-white p-5">
            <p className={`text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
            <p className="mt-1 text-sm font-semibold text-ukd-mute">{label}</p>
          </div>
        ))}
      </div>

      {/* Pending first — this page exists to make missing returns visible. */}
      {pending.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold text-ukd-red">
            रिपोर्ट लंबित ({pending.length})
          </h2>
          <ul className="grid gap-3">
            {pending.map((r) => (
              <li key={r.id} className="rounded-xl border border-ukd-red/30 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{r.unitName}</span>
                  {r.overdue && (
                    <span className="rounded-full bg-ukd-red/10 px-2.5 py-1 text-xs font-semibold text-ukd-red-dark">
                      समय-सीमा बीत चुकी
                    </span>
                  )}
                </div>
                <SubmitReport reportId={r.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {submitted.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">जमा हो चुकीं ({submitted.length})</h2>
          <div className="overflow-x-auto rounded-xl border border-ukd-line bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-ukd-line text-left text-ukd-mute">
                <tr>
                  <th className="px-4 py-3 font-semibold">इकाई</th>
                  <th className="px-4 py-3 font-semibold">बैठकें</th>
                  <th className="px-4 py-3 font-semibold">गतिविधियाँ</th>
                  <th className="px-4 py-3 font-semibold">नए सदस्य</th>
                  <th className="px-4 py-3 font-semibold">जमा</th>
                </tr>
              </thead>
              <tbody>
                {submitted.map((r) => (
                  <tr key={r.id} className="border-b border-ukd-line last:border-0">
                    <td className="px-4 py-3 font-semibold">{r.unitName}</td>
                    <td className="px-4 py-3 tabular-nums">{r.meetings ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{r.activities ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{r.newMembers ?? "—"}</td>
                    <td className="px-4 py-3 text-ukd-mute">
                      {r.submittedAt ? fmt.format(r.submittedAt) : "—"}
                      {r.late && <span className="ms-2 text-amber-700">विलंब से</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
