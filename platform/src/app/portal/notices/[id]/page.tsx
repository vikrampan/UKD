import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/session";
import { noticeReceipts } from "@/server/notices";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();

  const data = await noticeReceipts(actor, id);
  if (!data) notFound();

  const { notice, receipts } = data;
  const unread = receipts.filter((r) => !r.readAt);
  const read = receipts.filter((r) => r.readAt);

  return (
    <>
      <Link href="/portal/notices" className="text-sm text-ukd-mute hover:text-ukd-green">
        ← सभी सूचनाएँ
      </Link>

      <p className="mt-4 font-mono text-xs text-ukd-mute">{notice.code}</p>
      <h1 className="mt-1 text-2xl font-bold">{notice.title}</h1>
      <p className="mt-2 text-ukd-mute">
        {notice.issuedBy.name} · {notice.orgUnit.name} · {fmt.format(notice.createdAt)}
      </p>

      <p className="mt-6 max-w-2xl whitespace-pre-wrap">{notice.body}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["कुल प्राप्तकर्ता", receipts.length, "text-ukd-ink"],
          ["पढ़ा", read.length, "text-ukd-green"],
          ["नहीं पढ़ा", unread.length, unread.length > 0 ? "text-ukd-red" : "text-ukd-green"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-xl border border-ukd-line bg-white p-5">
            <p className={`text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
            <p className="mt-1 text-sm font-semibold text-ukd-mute">{label}</p>
          </div>
        ))}
      </div>

      {/* Unread first, deliberately: this list exists to be acted on. */}
      {unread.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold text-ukd-red">
            जिन्होंने अभी तक नहीं पढ़ा ({unread.length})
          </h2>
          <ul className="overflow-hidden rounded-xl border border-ukd-red/30 bg-white">
            {unread.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-ukd-line px-4 py-3 last:border-0">
                <span className="font-semibold">{r.user.name}</span>
                <span className="text-sm text-ukd-mute">
                  {r.user.karyakarta?.orgUnit.name ?? "—"} · {r.user.phone}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {read.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">पढ़ लिया ({read.length})</h2>
          <ul className="overflow-hidden rounded-xl border border-ukd-line bg-white">
            {read.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-ukd-line px-4 py-3 last:border-0">
                <span className="font-semibold">{r.user.name}</span>
                <span className="text-sm text-ukd-mute tabular-nums">
                  {r.acknowledgedAt
                    ? `पावती ${fmt.format(r.acknowledgedAt)}`
                    : `पढ़ा ${fmt.format(r.readAt!)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
