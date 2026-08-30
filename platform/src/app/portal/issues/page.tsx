import { requireActor } from "@/lib/session";
import { listIssues, allowedIssueTransitions, ISSUE_STATUS_LABEL, ISSUE_ACTION_LABEL } from "@/server/issues";
import { advanceIssueAction } from "@/server/actions/issues";
import { IssueStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const TONE: Record<IssueStatus, string> = {
  RECEIVED: "bg-slate-100 text-slate-700",
  ASSIGNED: "bg-sky-50 text-sky-800",
  IN_PROGRESS: "bg-amber-50 text-amber-800",
  RESOLVED: "bg-ukd-green/10 text-ukd-green",
  CLOSED: "bg-ukd-green/10 text-ukd-green",
};

export default async function IssuesPage() {
  const actor = await requireActor();
  const issues = await listIssues(actor);

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">जन समस्याएँ</h1>
      <p className="mb-8 text-ukd-mute">
        जन पोर्टल से आई शिकायतें — आपके अधिकार क्षेत्र की।
      </p>

      {issues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ukd-line bg-white p-12 text-center">
          <p className="font-semibold">अभी कोई समस्या दर्ज नहीं है।</p>
          <p className="mt-1 text-sm text-ukd-mute">
            नागरिकों द्वारा दर्ज की गई समस्याएँ यहाँ दिखेंगी।
          </p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {issues.map((i) => {
            const actions = allowedIssueTransitions(actor, i);
            return (
              <li key={i.id} className="rounded-xl border border-ukd-line bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-ukd-mute">{i.code}</p>
                    <h2 className="mt-1 font-bold">{i.title}</h2>
                    <p className="mt-1 text-sm text-ukd-mute">
                      {i.category} · {i.orgUnit.name}
                      {i.locality ? ` · ${i.locality}` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[i.status]}`}>
                    {ISSUE_STATUS_LABEL[i.status]}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm">{i.details}</p>

                <p className="mt-3 text-sm text-ukd-mute">
                  दर्ज करने वाले: {i.citizenName} · {i.citizenPhone}
                </p>

                {actions.length > 0 && (
                  <form action={advanceIssueAction} className="mt-4 flex flex-wrap gap-2">
                    <input type="hidden" name="issueId" value={i.id} />
                    {actions.map((to) => (
                      <button
                        key={to}
                        name="to"
                        value={to}
                        className="min-h-10 rounded-lg bg-ukd-green px-4 text-sm font-semibold text-white"
                      >
                        {ISSUE_ACTION_LABEL[to]}
                      </button>
                    ))}
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
