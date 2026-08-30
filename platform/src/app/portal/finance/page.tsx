import { requireActor } from "@/lib/session";
import {
  listEntries, totals, formatPaise, canSeeFinance,
  KIND_LABEL, LEDGER_STATUS_LABEL,
} from "@/server/finance";
import { assignableUnits } from "@/server/people";
import { decideAction } from "@/server/actions/finance";
import { EntryForm } from "./form";
import { LedgerStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium" });

export default async function FinancePage() {
  const actor = await requireActor();

  // Finance is CONFIDENTIAL. Clearance gates the page before anything loads.
  if (!canSeeFinance(actor)) {
    return (
      <div className="max-w-lg rounded-xl border border-ukd-line bg-white p-8">
        <h1 className="text-xl font-bold">वित्त</h1>
        <p className="mt-2 text-ukd-mute">
          इस अनुभाग के लिए आपके पास आवश्यक अनुमति नहीं है।
        </p>
      </div>
    );
  }

  const [entries, sums, units] = await Promise.all([
    listEntries(actor),
    totals(actor),
    assignableUnits(actor),
  ]);

  const pending = entries.filter((e) => e.status === LedgerStatus.PENDING_APPROVAL);

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">वित्त</h1>
      <p className="mb-8 max-w-2xl text-ukd-mute">
        सहयोग राशि और व्यय — हर प्रविष्टि पर स्वीकृति, और हर कार्रवाई दर्ज।
      </p>

      <div className="mb-10 grid gap-4 sm:grid-cols-4">
        {[
          ["कुल सहयोग", formatPaise(sums.income), "text-ukd-green"],
          ["कुल व्यय", formatPaise(sums.spend), "text-ukd-ink"],
          ["शेष", formatPaise(sums.balance), sums.balance < 0n ? "text-ukd-red" : "text-ukd-green"],
          ["स्वीकृति लंबित", sums.pending, sums.pending > 0 ? "text-amber-700" : "text-ukd-green"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-xl border border-ukd-line bg-white p-5">
            <p className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
            <p className="mt-1 text-sm font-semibold text-ukd-mute">{label}</p>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-bold">स्वीकृति लंबित ({pending.length})</h2>
          <ul className="grid gap-3">
            {pending.map((e) => (
              <li key={e.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-ukd-mute">{e.code}</p>
                    <p className="mt-1 font-bold">{e.description}</p>
                    <p className="mt-1 text-sm text-ukd-mute">
                      {KIND_LABEL[e.kind]} · {e.orgUnit.name} · {dateFmt.format(e.occurredOn)}
                      {e.counterparty ? ` · ${e.counterparty}` : ""}
                      {e.reference ? ` · ${e.reference}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-ukd-mute">दर्ज: {e.createdBy.name}</p>
                  </div>
                  <p className="text-xl font-bold tabular-nums">{formatPaise(e.amountPaise)}</p>
                </div>

                {/* Hidden for the person who recorded it — the service refuses
                    it anyway, but offering the button would be misleading. */}
                {e.createdById === actor.userId ? (
                  <p className="mt-3 text-sm text-ukd-mute">
                    अपनी दर्ज की गई प्रविष्टि पर आप निर्णय नहीं ले सकते।
                  </p>
                ) : (
                  <form action={decideAction} className="mt-4 grid gap-2 sm:flex sm:items-center">
                    <input type="hidden" name="entryId" value={e.id} />
                    <input name="note" placeholder="टिप्पणी (वैकल्पिक)"
                      className="min-h-10 flex-1 rounded-lg border border-ukd-line bg-white px-3 text-sm" />
                    <div className="flex gap-2">
                      <button name="decision" value="approve"
                        className="min-h-10 rounded-lg bg-ukd-green px-4 text-sm font-semibold text-white">
                        स्वीकृत करें
                      </button>
                      <button name="decision" value="reject"
                        className="min-h-10 rounded-lg border border-ukd-red px-4 text-sm font-semibold text-ukd-red">
                        अस्वीकार करें
                      </button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">नई प्रविष्टि</h2>
        <EntryForm units={units} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">बही</h2>
        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ukd-line bg-white p-12 text-center">
            <p className="font-semibold">अभी कोई प्रविष्टि नहीं है।</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ukd-line bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-ukd-line text-left text-ukd-mute">
                <tr>
                  <th className="px-4 py-3 font-semibold">क्रमांक</th>
                  <th className="px-4 py-3 font-semibold">विवरण</th>
                  <th className="px-4 py-3 font-semibold">प्रकार</th>
                  <th className="px-4 py-3 font-semibold">इकाई</th>
                  <th className="px-4 py-3 font-semibold">राशि</th>
                  <th className="px-4 py-3 font-semibold">स्थिति</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-ukd-line last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ukd-mute">{e.code}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{e.description}</span>
                      {e.counterparty && <span className="block text-xs text-ukd-mute">{e.counterparty}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{KIND_LABEL[e.kind]}</td>
                    <td className="whitespace-nowrap px-4 py-3">{e.orgUnit.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums">
                      {formatPaise(e.amountPaise)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        e.status === "APPROVED" ? "bg-ukd-green/10 text-ukd-green"
                        : e.status === "REJECTED" ? "bg-ukd-red/10 text-ukd-red-dark"
                        : "bg-amber-50 text-amber-800"
                      }`}>
                        {LEDGER_STATUS_LABEL[e.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
