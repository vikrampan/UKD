import { requireActor } from "@/lib/session";
import { db } from "@/lib/db";
import { ROLE_LABEL, DEPARTMENT_LABEL } from "@/server/people";
import { clearanceOf } from "@/lib/rbac";
import { PasswordForm } from "../password/form";
import { MfaPanel, SessionsPanel } from "./panels";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("hi-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function SettingsPage() {
  const actor = await requireActor();

  const [user, sessions] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: actor.userId },
      include: {
        karyakarta: { include: { orgUnit: true } },
        grants: { include: { orgUnit: true } },
      },
    }),
    db.session.count({ where: { userId: actor.userId, revokedAt: null } }),
  ]);

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">सेटिंग्स</h1>
      <p className="mb-10 text-ukd-mute">आपका खाता, पहुँच और सुरक्षा।</p>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">आपका विवरण</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["नाम", user.name],
            ["मोबाइल नंबर", user.phone],
            ["कार्यकर्ता क्रमांक", user.karyakarta?.code ?? "—"],
            ["अंतिम साइन इन", user.lastLoginAt ? fmt.format(user.lastLoginAt) : "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-ukd-line bg-white p-4">
              <dt className="text-xs font-semibold text-ukd-mute">{k}</dt>
              <dd className="mt-1 font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">आपकी पहुँच</h2>
        <p className="mb-3 text-sm text-ukd-mute">
          आप क्या देख और कर सकते हैं, यह इन्हीं से तय होता है। बदलाव केवल आपसे वरिष्ठ
          पदाधिकारी कर सकते हैं।
        </p>
        <ul className="overflow-hidden rounded-xl border border-ukd-line bg-white">
          {user.grants.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ukd-line px-4 py-3 last:border-0">
              <span className="font-semibold">{ROLE_LABEL[g.role]}</span>
              <span className="text-sm text-ukd-mute">{DEPARTMENT_LABEL[g.department]}</span>
              <span className="text-sm text-ukd-mute">{g.orgUnit?.name ?? "सम्पूर्ण संगठन"}</span>
              <span className="ms-auto rounded-full bg-ukd-paper px-2.5 py-1 text-xs font-semibold">
                अधिकतम वर्गीकरण: {g.maxSensitivity}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-ukd-mute">
          कुल वर्गीकरण स्तर: <span className="font-semibold">{clearanceOf(actor)}</span>
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">दो-चरणीय सत्यापन</h2>
        <MfaPanel enabled={user.mfaEnabled} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">सक्रिय सत्र</h2>
        <SessionsPanel count={sessions} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">पासवर्ड बदलें</h2>
        <div className="max-w-md">
          <PasswordForm />
        </div>
      </section>
    </>
  );
}
