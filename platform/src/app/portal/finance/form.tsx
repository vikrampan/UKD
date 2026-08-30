"use client";

import { useActionState } from "react";
import { recordEntryAction, type FinanceState } from "@/server/actions/finance";

const field =
  "min-h-11 w-full rounded-lg border border-ukd-line bg-white px-3 outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20";

export function EntryForm({ units }: { units: { id: string; name: string; depth: number }[] }) {
  const [state, action, pending] = useActionState<FinanceState, FormData>(recordEntryAction, {});

  return (
    <form action={action} className="grid max-w-3xl gap-4 rounded-xl border border-ukd-line bg-white p-5">
      {state.error && (
        <p role="alert" className="rounded-lg border border-ukd-red/30 bg-ukd-red/5 px-4 py-3 text-sm text-ukd-red-dark">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-ukd-green/30 bg-ukd-green/5 px-4 py-3 text-sm text-ukd-green">
          प्रविष्टि दर्ज हो गई — स्वीकृति हेतु भेज दी गई है।
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">प्रकार</span>
          <select name="kind" defaultValue="CONTRIBUTION" className={field}>
            <option value="CONTRIBUTION">सहयोग राशि</option>
            <option value="EXPENSE">व्यय</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">राशि (₹)</span>
          <input name="amount" inputMode="decimal" placeholder="2500.00" required className={field} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">दिनांक</span>
          <input type="date" name="occurredOn" required
            defaultValue={new Date().toISOString().slice(0, 10)} className={field} />
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">विवरण</span>
        <input name="description" required className={field} />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">किससे / किसको</span>
          <input name="counterparty" placeholder="दानदाता या विक्रेता" className={field} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">रसीद / बिल क्रमांक</span>
          <input name="reference" className={field} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">इकाई</span>
          <select name="orgUnitId" required defaultValue="" className={field}>
            <option value="" disabled>इकाई चुनें</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{"— ".repeat(u.depth)}{u.name}</option>
            ))}
          </select>
        </label>
      </div>

      <button type="submit" disabled={pending}
        className="min-h-11 justify-self-start rounded-lg bg-ukd-green px-6 font-semibold text-white disabled:opacity-60">
        {pending ? "दर्ज कर रहे हैं…" : "प्रविष्टि दर्ज करें"}
      </button>
    </form>
  );
}
