import Link from "next/link";
import { requireActor } from "@/lib/session";
import { listNotices, myNotices } from "@/server/notices";
import { acknowledgeAction } from "@/server/actions/notices";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium" });

export default async function NoticesPage() {
  const actor = await requireActor();
  const [inbox, issued] = await Promise.all([myNotices(actor), listNotices(actor)]);
  const pending = inbox.filter((r) => !r.acknowledgedAt);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">सूचनाएँ व परिपत्र</h1>
          <p className="text-ukd-mute">जारी की गई सूचनाएँ, और आपको मिली सूचनाएँ।</p>
        </div>
        <Link href="/portal/notices/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-ukd-green px-4 font-semibold text-white">
          नई सूचना जारी करें
        </Link>
      </div>

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-bold">आपके लिए ({pending.length})</h2>
          <ul className="grid gap-3">
            {pending.map((r) => (
              <li key={r.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                <p className="font-mono text-xs text-ukd-mute">{r.notice.code}</p>
                <h3 className="mt-1 font-bold">{r.notice.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm">{r.notice.body}</p>
                <p className="mt-3 text-sm text-ukd-mute">
                  {r.notice.issuedBy.name} · {r.notice.orgUnit.name}
                  {r.notice.dueAt ? ` · अंतिम तिथि ${dateFmt.format(r.notice.dueAt)}` : ""}
                </p>
                {r.notice.requiresAck && (
                  <form action={acknowledgeAction} className="mt-4">
                    <input type="hidden" name="noticeId" value={r.notice.id} />
                    <button className="min-h-10 rounded-lg bg-ukd-green px-4 text-sm font-semibold text-white">
                      पढ़ लिया — पावती दें
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">जारी की गई सूचनाएँ</h2>
        {issued.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ukd-line bg-white p-12 text-center">
            <p className="font-semibold">अभी कोई सूचना जारी नहीं हुई है।</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {issued.map((n) => {
              const unread = n.recipients - n.readCount;
              return (
                <li key={n.id} className="rounded-xl border border-ukd-line bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-ukd-mute">{n.code}</p>
                      <Link href={`/portal/notices/${n.id}`} className="mt-1 block font-bold hover:text-ukd-green">
                        {n.title}
                      </Link>
                      <p className="mt-1 text-sm text-ukd-mute">
                        {n.orgUnit.name} · {dateFmt.format(n.createdAt)}
                      </p>
                    </div>

                    {/* The unread tally is the finding — lead with it. */}
                    <div className="text-right">
                      <p className={`text-2xl font-bold tabular-nums ${unread > 0 ? "text-ukd-red" : "text-ukd-green"}`}>
                        {unread}
                      </p>
                      <p className="text-xs font-semibold text-ukd-mute">
                        {unread > 0 ? "ने नहीं पढ़ा" : "सबने पढ़ लिया"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-ukd-mute tabular-nums">
                    {n.readCount}/{n.recipients} पढ़ा
                    {n.requiresAck ? ` · ${n.ackCount}/${n.recipients} पावती` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
