"use client";

import { useActionState } from "react";
import { raiseTicketAction, type OpsState } from "@/server/actions/ops";

const field =
  "min-h-11 w-full rounded-lg border border-ukd-line bg-white px-3 outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20";

export function TicketForm({
  units, departments,
}: { units: { id: string; name: string; depth: number }[]; departments: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<OpsState, FormData>(raiseTicketAction, {});

  return (
    <form action={action} className="grid gap-4 rounded-xl border border-ukd-line bg-white p-5">
      {state.error && <p role="alert" className="rounded-lg border border-ukd-red/30 bg-ukd-red/5 px-4 py-3 text-sm text-ukd-red-dark">{state.error}</p>}
      {state.ok && <p className="rounded-lg border border-ukd-green/30 bg-ukd-green/5 px-4 py-3 text-sm text-ukd-green">{state.ok}</p>}

      <label className="grid gap-1.5"><span className="text-sm font-semibold">क्या चाहिए</span>
        <input name="title" required className={field} /></label>
      <label className="grid gap-1.5"><span className="text-sm font-semibold">विवरण</span>
        <textarea name="details" rows={3} required className={`${field} py-2`} /></label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5"><span className="text-sm font-semibold">विभाग</span>
          <select name="department" defaultValue="IT" className={field}>
            {departments.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select></label>
        <label className="grid gap-1.5"><span className="text-sm font-semibold">प्राथमिकता</span>
          <select name="priority" defaultValue="MEDIUM" className={field}>
            <option value="LOW">निम्न</option><option value="MEDIUM">मध्यम</option>
            <option value="HIGH">उच्च</option><option value="CRITICAL">अत्यावश्यक</option>
          </select></label>
        <label className="grid gap-1.5"><span className="text-sm font-semibold">इकाई</span>
          <select name="orgUnitId" required defaultValue="" className={field}>
            <option value="" disabled>इकाई चुनें</option>
            {units.map((u) => <option key={u.id} value={u.id}>{"— ".repeat(u.depth)}{u.name}</option>)}
          </select></label>
      </div>

      <button disabled={pending} className="min-h-11 justify-self-start rounded-lg bg-ukd-green px-6 font-semibold text-white disabled:opacity-60">
        {pending ? "दर्ज कर रहे हैं…" : "अनुरोध दर्ज करें"}
      </button>
    </form>
  );
}
