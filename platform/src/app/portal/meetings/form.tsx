"use client";

import { useActionState } from "react";
import { scheduleMeetingAction, type OpsState } from "@/server/actions/ops";

const field =
  "min-h-11 w-full rounded-lg border border-ukd-line bg-white px-3 outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20";

export function MeetingForm({ units }: { units: { id: string; name: string; depth: number }[] }) {
  const [state, action, pending] = useActionState<OpsState, FormData>(scheduleMeetingAction, {});

  return (
    <form action={action} className="grid gap-4 rounded-xl border border-ukd-line bg-white p-5">
      {state.error && <p role="alert" className="rounded-lg border border-ukd-red/30 bg-ukd-red/5 px-4 py-3 text-sm text-ukd-red-dark">{state.error}</p>}
      {state.ok && <p className="rounded-lg border border-ukd-green/30 bg-ukd-green/5 px-4 py-3 text-sm text-ukd-green">{state.ok}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5"><span className="text-sm font-semibold">बैठक का शीर्षक</span>
          <input name="title" required className={field} /></label>
        <label className="grid gap-1.5"><span className="text-sm font-semibold">स्थान</span>
          <input name="venue" required className={field} /></label>
      </div>
      <label className="grid gap-1.5"><span className="text-sm font-semibold">कार्यसूची</span>
        <textarea name="agenda" rows={3} required className={`${field} py-2`} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5"><span className="text-sm font-semibold">दिनांक व समय</span>
          <input type="datetime-local" name="heldAt" required className={field} /></label>
        <label className="grid gap-1.5"><span className="text-sm font-semibold">इकाई</span>
          <select name="orgUnitId" required defaultValue="" className={field}>
            <option value="" disabled>इकाई चुनें</option>
            {units.map((u) => <option key={u.id} value={u.id}>{"— ".repeat(u.depth)}{u.name}</option>)}
          </select></label>
      </div>

      <button disabled={pending} className="min-h-11 justify-self-start rounded-lg bg-ukd-green px-6 font-semibold text-white disabled:opacity-60">
        {pending ? "निर्धारित कर रहे हैं…" : "बैठक निर्धारित करें"}
      </button>
    </form>
  );
}
