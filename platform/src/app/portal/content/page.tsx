import { requireActor } from "@/lib/session";
import { listEvents, listDocuments, listAnnouncements, EVENT_STATUS_LABEL } from "@/server/content";
import { assignableUnits } from "@/server/people";
import { togglePublishAction, completeEventAction } from "@/server/actions/content";
import { EventForm, DocumentForm, AnnouncementForm } from "./forms";

export const dynamic = "force-dynamic";

const dt = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium", timeStyle: "short" });
const d = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium" });

function PublicTag({ on }: { on: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
      on ? "bg-ukd-green/10 text-ukd-green" : "bg-ukd-paper text-ukd-mute"
    }`}>
      {on ? "सार्वजनिक" : "आंतरिक"}
    </span>
  );
}

export default async function ContentPage() {
  const actor = await requireActor();
  const [events, documents, posts, units] = await Promise.all([
    listEvents(actor), listDocuments(actor), listAnnouncements(actor), assignableUnits(actor),
  ]);

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">सामग्री</h1>
      <p className="mb-10 max-w-2xl text-ukd-mute">
        कार्यक्रम, दस्तावेज़ और सूचनाएँ। जो सार्वजनिक चिह्नित है वही दल की वेबसाइट पर दिखता है —
        बाक़ी सब आंतरिक रहता है।
      </p>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-bold">कार्यक्रम</h2>
        <EventForm units={units} />
        {events.length > 0 && (
          <ul className="mt-4 grid gap-3">
            {events.map((e) => (
              <li key={e.id} className="rounded-xl border border-ukd-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-ukd-mute">{e.code}</p>
                    <p className="mt-1 font-bold">{e.title}</p>
                    <p className="mt-1 text-sm text-ukd-mute">
                      {e.kind} · {e.venue} · {e.orgUnit.name} · {dt.format(e.startsAt)}
                    </p>
                    {e.outcome && <p className="mt-2 text-sm">परिणाम: {e.outcome} · उपस्थिति {e.attendance}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <PublicTag on={e.isPublic} />
                    <span className="rounded-full bg-ukd-paper px-2.5 py-1 text-xs font-semibold">
                      {EVENT_STATUS_LABEL[e.status]}
                    </span>
                  </div>
                </div>
                {e.status === "PLANNED" && (
                  <form action={completeEventAction} className="mt-3 grid gap-2 sm:flex sm:items-center">
                    <input type="hidden" name="eventId" value={e.id} />
                    <input name="attendance" type="number" min={0} placeholder="उपस्थिति"
                      className="min-h-10 w-32 rounded-lg border border-ukd-line px-3 text-sm" />
                    <input name="outcome" placeholder="परिणाम / निष्कर्ष" required
                      className="min-h-10 flex-1 rounded-lg border border-ukd-line px-3 text-sm" />
                    <button className="min-h-10 rounded-lg bg-ukd-green px-4 text-sm font-semibold text-white">
                      सम्पन्न दर्ज करें
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-bold">दस्तावेज़</h2>
        <DocumentForm units={units} />
        {documents.length > 0 && (
          <ul className="mt-4 overflow-hidden rounded-xl border border-ukd-line bg-white">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ukd-line px-4 py-3 last:border-0">
                <span className="font-mono text-xs text-ukd-mute">{doc.code}</span>
                <span className="font-semibold">{doc.title}</span>
                <span className="text-sm text-ukd-mute">{doc.category} · {doc.orgUnit.name}</span>
                <span className="ms-auto flex items-center gap-3">
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold text-ukd-green underline underline-offset-4">
                      खोलें
                    </a>
                  )}
                  <PublicTag on={doc.isPublic} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold">सूचनाएँ व प्रेस</h2>
        <AnnouncementForm units={units} />
        {posts.length > 0 && (
          <ul className="mt-4 grid gap-3">
            {posts.map((p) => (
              <li key={p.id} className="rounded-xl border border-ukd-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{p.title}</p>
                    <p className="mt-1 text-sm text-ukd-mute">
                      {p.tag} · {p.author.name}
                      {p.publishedAt ? ` · प्रकाशित ${d.format(p.publishedAt)}` : " · प्रारूप"}
                    </p>
                    <p className="mt-2 text-sm">{p.excerpt}</p>
                  </div>
                  <form action={togglePublishAction}>
                    <input type="hidden" name="postId" value={p.id} />
                    <input type="hidden" name="publish" value={String(!p.isPublished)} />
                    <button className={`min-h-10 rounded-lg px-4 text-sm font-semibold ${
                      p.isPublished ? "border border-ukd-line" : "bg-ukd-green text-white"
                    }`}>
                      {p.isPublished ? "अप्रकाशित करें" : "प्रकाशित करें"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
