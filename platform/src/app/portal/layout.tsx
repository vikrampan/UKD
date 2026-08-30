import { redirect } from "next/navigation";
import Link from "next/link";
import { getActor } from "@/lib/session";
import { visibleModules } from "@/lib/nav";
import { clearanceOf, isUnscoped } from "@/lib/rbac";

// Session-dependent: never prerender or cache.
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");

  const modules = visibleModules(actor);
  const scopeLabel = isUnscoped(actor)
    ? "सम्पूर्ण संगठन"
    : (actor.grants.find((g) => g.orgUnit)?.orgUnit?.name ?? "सीमित पहुँच");

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="h-1 bg-gradient-to-r from-ukd-green via-ukd-green to-ukd-red" />

      <header className="border-b border-ukd-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/portal" className="font-bold text-lg">
            उत्तराखंड क्रांति दल
          </Link>
          <span className="rounded-full bg-ukd-green/10 px-3 py-1 text-xs font-semibold text-ukd-green">
            {scopeLabel}
          </span>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            {modules.map((m) => (
              <Link key={m.href} href={m.href} className="hover:text-ukd-green">
                {m.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-3 text-sm">
            <span className="text-ukd-mute">{actor.name}</span>
            <form action="/api/auth/logout" method="post">
              <button className="min-h-9 rounded-lg border border-ukd-line px-3 font-semibold hover:border-ukd-red hover:text-ukd-red">
                साइन आउट
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-ukd-line px-4 py-4 text-center text-xs text-ukd-mute">
        अधिकतम वर्गीकरण: {clearanceOf(actor)} · केवल अधिकृत उपयोग हेतु
      </footer>
    </div>
  );
}
