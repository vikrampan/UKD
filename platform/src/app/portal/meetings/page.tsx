import Link from "next/link";
import { requireActor } from "@/lib/session";
import { listMeetings, MEETING_STATUS_LABEL } from "@/server/meetings";
import { assignableUnits } from "@/server/people";
import { recordMinutesAction, decisionToTaskAction } from "@/server/actions/ops";
import { MeetingForm } from "./form";

export const dynamic = "force-dynamic";

const dt = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function MeetingsPage() {
  const actor = await requireActor();
  const [meetings, units] = await Promise.all([listMeetings(actor), assignableUnits(actor)]);

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">बैठकें</h1>
      <p className="mb-8 max-w-2xl text-ukd-mute">
        कार्यसूची पहले, कार्यवृत्त बाद में — और हर निर्णय को ज़िम्मेदारी सहित कार्य में बदला जा सकता है।
      </p>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold">नई बैठक</h2>
        <MeetingForm units={units} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold">बैठकें</h2>
        {meetings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ukd-line bg-white p-12 text-center">
            <p className="font-semibold">अभी कोई बैठक निर्धारित नहीं है।</p>
          </div>
        ) : (
          <ul className="grid gap-4">
            {meetings.map((m) => (
              <li key={m.id} className="rounded-xl border border-ukd-line bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-ukd-mute">{m.code}</p>
                    <p className="mt-1 font-bold">{m.title}</p>
                    <p className="mt-1 text-sm text-ukd-mute">
                      {m.orgUnit.name} · {m.venue} · {dt.format(m.heldAt)}
                      {m.attendance !== null ? ` · उपस्थिति ${m.attendance}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-ukd-paper px-2.5 py-1 text-xs font-semibold">
                    {MEETING_STATUS_LABEL[m.status]}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm">
                  <span className="font-semibold">कार्यसूची: </span>{m.agenda}
                </p>

                {m.minutes && (
                  <p className="mt-3 whitespace-pre-wrap rounded-lg bg-ukd-paper px-4 py-3 text-sm">
                    <span className="font-semibold">कार्यवृत्त: </span>{m.minutes}
                  </p>
                )}

                {m.status === "SCHEDULED" && (
                  <form action={recordMinutesAction} className="mt-4 grid gap-3 rounded-lg border border-ukd-line p-4">
                    <input type="hidden" name="meetingId" value={m.id} />
                    <p className="text-sm font-semibold">कार्यवृत्त दर्ज करें</p>
                    <textarea name="minutes" rows={3} required placeholder="बैठक में क्या हुआ"
                      className="min-h-11 rounded-lg border border-ukd-line px-3 py-2 text-sm" />
                    <textarea name="decisions" rows={3} placeholder="निर्णय — हर पंक्ति में एक"
                      className="min-h-11 rounded-lg border border-ukd-line px-3 py-2 text-sm" />
                    <div className="flex flex-wrap gap-2">
                      <input name="attendance" type="number" min={0} placeholder="उपस्थिति"
                        className="min-h-10 w-32 rounded-lg border border-ukd-line px-3 text-sm" />
                      <button className="min-h-10 rounded-lg bg-ukd-green px-4 text-sm font-semibold text-white">
                        कार्यवृत्त सुरक्षित करें
                      </button>
                    </div>
                  </form>
                )}

                {m.decisions.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold">निर्णय ({m.decisions.length})</p>
                    <ul className="grid gap-2">
                      {m.decisions.map((dec) => (
                        <li key={dec.id} className="rounded-lg border border-ukd-line p-3">
                          <p className="text-sm">{dec.text}</p>
                          {dec.taskId ? (
                            <Link href={`/portal/tasks/${dec.taskId}`}
                              className="mt-2 inline-block text-sm font-semibold text-ukd-green underline underline-offset-4">
                              कार्य बन चुका है — देखें →
                            </Link>
                          ) : (
                            <form action={decisionToTaskAction} className="mt-2 flex flex-wrap items-center gap-2">
                              <input type="hidden" name="decisionId" value={dec.id} />
                              <input type="date" name="dueAt"
                                className="min-h-9 rounded-lg border border-ukd-line px-2 text-sm" />
                              <button className="min-h-9 rounded-lg border border-ukd-green px-3 text-sm font-semibold text-ukd-green">
                                कार्य में बदलें
                              </button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
