"use client";

import Link from "next/link";
import { useActionState } from "react";
import { invitePersonAction, type InviteState } from "@/server/actions/people";

type Option = { value: string; label: string };
type Unit = { id: string; name: string; depth: number };

const field =
  "min-h-11 w-full rounded-lg border border-ukd-line bg-white px-3 outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20";

export function InviteForm({
  units, roles, departments,
}: { units: Unit[]; roles: Option[]; departments: Option[] }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(invitePersonAction, {});

  // Shown once. There is no way to retrieve this password later, by design.
  if (state.created) {
    return (
      <div className="max-w-lg rounded-xl border border-ukd-green/30 bg-white p-6">
        <h2 className="text-lg font-bold">{state.created.name} जोड़ लिए गए।</h2>
        <p className="mt-1 text-sm text-ukd-mute">
          यह पासवर्ड दोबारा नहीं दिखेगा। इसे अभी सदस्य तक पहुँचाएँ।
        </p>

        <dl className="mt-5 grid gap-3">
          {[
            ["कार्यकर्ता क्रमांक", state.created.code],
            ["मोबाइल नंबर", state.created.phone],
            ["अस्थायी पासवर्ड", state.created.temporaryPassword],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-ukd-paper px-4 py-3">
              <dt className="text-xs font-semibold text-ukd-mute">{k}</dt>
              <dd className="mt-0.5 font-mono text-lg font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/portal/karyakartas"
            className="inline-flex min-h-11 items-center rounded-lg bg-ukd-green px-4 font-semibold text-white">
            सूची पर लौटें
          </Link>
          <Link href="/portal/karyakartas/new"
            className="inline-flex min-h-11 items-center rounded-lg border border-ukd-line px-4 font-semibold">
            एक और जोड़ें
          </Link>
        </div>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <p className="max-w-lg rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
        आपके पास कोई ऐसी भूमिका नहीं है जिसे आप किसी और को दे सकें।
      </p>
    );
  }

  return (
    <form action={action} className="grid max-w-2xl gap-5">
      {state.error && (
        <p role="alert" className="rounded-lg border border-ukd-red/30 bg-ukd-red/5 px-4 py-3 text-sm text-ukd-red-dark">
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">पूरा नाम</span>
          <input name="name" required className={field} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">मोबाइल नंबर</span>
          <input name="phone" inputMode="numeric" maxLength={10} required className={field} />
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">इकाई</span>
        <select name="orgUnitId" required defaultValue="" className={field}>
          <option value="" disabled>इकाई चुनें</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{"— ".repeat(u.depth)}{u.name}</option>
          ))}
        </select>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">भूमिका</span>
          <select name="role" required defaultValue="" className={field}>
            <option value="" disabled>भूमिका चुनें</option>
            {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">विभाग</span>
          <select name="department" defaultValue="ORGANISATION" className={field}>
            {departments.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">दायित्व</span>
        <textarea name="responsibilities" rows={3} className={`${field} py-2`} />
      </label>

      <button type="submit" disabled={pending}
        className="min-h-11 justify-self-start rounded-lg bg-ukd-green px-6 font-semibold text-white disabled:opacity-60">
        {pending ? "जोड़ रहे हैं…" : "सदस्य जोड़ें"}
      </button>
    </form>
  );
}
