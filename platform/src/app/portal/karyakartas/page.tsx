import Link from "next/link";
import { requireActor } from "@/lib/session";
import { listPeople, ROLE_LABEL } from "@/server/people";
import { setActiveAction } from "@/server/actions/people";

export const dynamic = "force-dynamic";

export default async function KaryakartasPage() {
  const actor = await requireActor();
  const people = await listPeople(actor);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">कार्यकर्ता</h1>
          <p className="text-ukd-mute">आपके अधिकार क्षेत्र के पदाधिकारी और कार्यकर्ता।</p>
        </div>
        <Link href="/portal/karyakartas/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-ukd-green px-4 font-semibold text-white">
          नया सदस्य जोड़ें
        </Link>
      </div>

      {people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ukd-line bg-white p-12 text-center">
          <p className="font-semibold">अभी कोई कार्यकर्ता दर्ज नहीं है।</p>
          <p className="mt-1 text-sm text-ukd-mute">पहला सदस्य जोड़कर संगठन बनाना शुरू करें।</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {people.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-ukd-line bg-white p-4">
              <div className="min-w-0">
                <p className="font-semibold">{p.user.name}</p>
                <p className="text-sm text-ukd-mute">
                  <span className="font-mono text-xs">{p.code}</span> · {p.orgUnit.name} · {p.user.phone}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {p.user.grants.map((g) => (
                  <span key={g.id} className="rounded-full bg-ukd-paper px-2.5 py-1 text-xs font-semibold">
                    {ROLE_LABEL[g.role]}
                  </span>
                ))}
              </div>

              <div className="ms-auto flex items-center gap-3">
                {p.user.mustChangePassword && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    पासवर्ड बदलना शेष
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  p.isActive ? "bg-ukd-green/10 text-ukd-green" : "bg-ukd-red/10 text-ukd-red-dark"
                }`}>
                  {p.isActive ? "सक्रिय" : "निलंबित"}
                </span>
                <form action={setActiveAction}>
                  <input type="hidden" name="karyakartaId" value={p.id} />
                  <input type="hidden" name="active" value={String(!p.isActive)} />
                  <button className="min-h-9 rounded-lg border border-ukd-line px-3 text-sm font-semibold hover:border-ukd-red hover:text-ukd-red">
                    {p.isActive ? "निलंबित करें" : "पुनः सक्रिय करें"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
