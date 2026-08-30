import { requireActor } from "@/lib/session";
import { districtHealth, rollup, type DistrictHealth, type Facet } from "@/server/analytics";

export const dynamic = "force-dynamic";

/**
 * लाल → हरा. Deliberately a coarse five-step scale rather than a smooth
 * gradient: the point is to make weak districts findable across a room, not
 * to imply a precision the underlying counts do not have.
 */
function tone(score: number | null) {
  if (score === null) return { bg: "bg-slate-100", text: "text-slate-500", label: "आँकड़े नहीं" };
  if (score >= 85) return { bg: "bg-ukd-green", text: "text-white", label: "मज़बूत" };
  if (score >= 70) return { bg: "bg-ukd-green/70", text: "text-white", label: "ठीक" };
  if (score >= 50) return { bg: "bg-amber-400", text: "text-amber-950", label: "ध्यान दें" };
  if (score >= 30) return { bg: "bg-ukd-red/70", text: "text-white", label: "कमज़ोर" };
  return { bg: "bg-ukd-red", text: "text-white", label: "अत्यंत कमज़ोर" };
}

function Bar({ label, facet }: { label: string; facet: Facet }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 text-ukd-mute">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ukd-line">
        <div
          className={`h-full rounded-full ${
            facet.pct === null ? "bg-slate-300"
              : facet.pct >= 70 ? "bg-ukd-green"
              : facet.pct >= 40 ? "bg-amber-400"
              : "bg-ukd-red"
          }`}
          style={{ width: `${facet.pct ?? 0}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-end tabular-nums text-ukd-mute">
        {facet.total === 0 ? "—" : `${facet.done}/${facet.total}`}
      </span>
    </div>
  );
}

export default async function AnalyticsPage() {
  const actor = await requireActor();
  const rows = await districtHealth(actor);
  const totals = rollup(rows);

  // Weakest first: this screen exists to direct attention, not to reassure.
  const ordered = [...rows].sort((a, b) => (a.score ?? 999) - (b.score ?? 999));

  const byRegion = ordered.reduce<Record<string, DistrictHealth[]>>((acc, d) => {
    (acc[d.region] ??= []).push(d);
    return acc;
  }, {});

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">संगठन का स्वास्थ्य</h1>
      <p className="mb-8 max-w-2xl text-ukd-mute">
        हर ज़िले का स्कोर उसी काम से बनता है जो संगठन पहले से दर्ज करता है — जन समस्याओं
        का समाधान, साप्ताहिक रिपोर्ट, कार्य और परिपत्रों की पावती।
      </p>

      <div className="mb-10 grid gap-4 sm:grid-cols-4">
        {[
          ["औसत स्कोर", totals.averageScore ?? "—", "text-ukd-ink"],
          ["कमज़ोर ज़िले", totals.weak, totals.weak > 0 ? "text-ukd-red" : "text-ukd-green"],
          ["समस्याएँ हल", `${totals.issues.done}/${totals.issues.total}`, "text-ukd-ink"],
          ["रिपोर्ट जमा", `${totals.reports.done}/${totals.reports.total}`, "text-ukd-ink"],
        ].map(([label, value, t]) => (
          <div key={String(label)} className="rounded-xl border border-ukd-line bg-white p-5">
            <p className={`text-3xl font-bold tabular-nums ${t}`}>{value}</p>
            <p className="mt-1 text-sm font-semibold text-ukd-mute">{label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ukd-line bg-white p-12 text-center">
          <p className="font-semibold">आपके अधिकार क्षेत्र में कोई ज़िला नहीं है।</p>
        </div>
      ) : (
        <>
          {/* Tiles, not a map: real district boundaries would need proper
              geodata, and an approximated outline of Uttarakhand would be
              worse than no map at all. */}
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-bold">ज़िलेवार स्थिति</h2>
            {Object.entries(byRegion).map(([region, list]) => (
              <div key={region} className="mb-5">
                <p className="mb-2 text-sm font-semibold text-ukd-mute">{region}</p>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {list.map((d) => {
                    const t = tone(d.score);
                    return (
                      <div key={d.id} className={`rounded-xl p-4 ${t.bg} ${t.text}`}>
                        <p className="text-sm font-semibold">{d.name}</p>
                        <p className="mt-2 text-3xl font-bold tabular-nums">
                          {d.score ?? "—"}
                        </p>
                        <p className="mt-0.5 text-xs opacity-85">{t.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold">विस्तृत विवरण</h2>
            <ul className="grid gap-3">
              {ordered.map((d) => (
                <li key={d.id} className="rounded-xl border border-ukd-line bg-white p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold">{d.name}</p>
                      <p className="text-xs text-ukd-mute">{d.region}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${tone(d.score).bg} ${tone(d.score).text}`}>
                      {d.score ?? "—"}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    <Bar label="समस्याएँ" facet={d.issues} />
                    <Bar label="रिपोर्ट" facet={d.reports} />
                    <Bar label="कार्य" facet={d.tasks} />
                    <Bar label="परिपत्र" facet={d.notices} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
