import { requireActor } from "@/lib/session";
import { listTickets, allowedTicketTransitions, TICKET_STATUS_LABEL, TICKET_ACTION_LABEL } from "@/server/helpdesk";
import { assignableUnits, DEPARTMENT_LABEL } from "@/server/people";
import { advanceTicketAction } from "@/server/actions/ops";
import { Department, TicketStatus } from "@prisma/client";
import { TicketForm } from "./form";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium" });

const TONE: Record<TicketStatus, string> = {
  OPEN: "bg-ukd-red/10 text-ukd-red-dark",
  ASSIGNED: "bg-sky-50 text-sky-800",
  IN_PROGRESS: "bg-amber-50 text-amber-800",
  RESOLVED: "bg-ukd-green/10 text-ukd-green",
  CLOSED: "bg-ukd-paper text-ukd-mute",
};

export default async function HelpdeskPage() {
  const actor = await requireActor();
  const [tickets, units] = await Promise.all([listTickets(actor), assignableUnits(actor)]);
  const open = tickets.filter((t) => t.status !== "CLOSED");

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">सहायता केंद्र</h1>
      <p className="mb-8 max-w-2xl text-ukd-mute">
        पोर्टल, दस्तावेज़, उपकरण या प्रोफ़ाइल सुधार से जुड़ी आंतरिक सहायता के अनुरोध।
      </p>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold">नया अनुरोध</h2>
        <TicketForm
          units={units}
          departments={Object.values(Department).map((d) => ({ value: d, label: DEPARTMENT_LABEL[d] }))}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold">अनुरोध ({open.length} खुले)</h2>
        {tickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ukd-line bg-white p-12 text-center">
            <p className="font-semibold">अभी कोई अनुरोध नहीं है।</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {tickets.map((t) => {
              const actions = allowedTicketTransitions(actor, t);
              const needsResolution = actions.includes(TicketStatus.RESOLVED);
              return (
                <li key={t.id} className="rounded-xl border border-ukd-line bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-ukd-mute">{t.code}</p>
                      <p className="mt-1 font-bold">{t.title}</p>
                      <p className="mt-1 text-sm text-ukd-mute">
                        {DEPARTMENT_LABEL[t.department]} · {t.orgUnit.name} · {t.raisedBy.name} · {fmt.format(t.createdAt)}
                        {t.assignedTo ? ` · ${t.assignedTo.name} को सौंपा` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[t.status]}`}>
                      {TICKET_STATUS_LABEL[t.status]}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm">{t.details}</p>
                  {t.resolution && (
                    <p className="mt-3 rounded-lg bg-ukd-green/5 px-4 py-3 text-sm">
                      <span className="font-semibold">हल: </span>{t.resolution}
                    </p>
                  )}

                  {actions.length > 0 && (
                    <form action={advanceTicketAction} className="mt-4 grid gap-2 sm:flex sm:items-center">
                      <input type="hidden" name="ticketId" value={t.id} />
                      {needsResolution && (
                        <input name="resolution" required placeholder="हल का विवरण"
                          className="min-h-10 flex-1 rounded-lg border border-ukd-line px-3 text-sm" />
                      )}
                      {actions.map((to) => (
                        <button key={to} name="to" value={to}
                          className="min-h-10 rounded-lg bg-ukd-green px-4 text-sm font-semibold text-white">
                          {TICKET_ACTION_LABEL[to]}
                        </button>
                      ))}
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
