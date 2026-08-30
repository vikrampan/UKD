"use client";

import { useActionState } from "react";
import { openWeekAction, type ReportState } from "@/server/actions/reports";

export function OpenWeek({ units }: { units: { id: string; name: string; depth: number }[] }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(openWeekAction, {});

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {state.error && (
        <span role="alert" className="text-sm text-ukd-red-dark">{state.error}</span>
      )}
      <select name="orgUnitId" required defaultValue=""
        className="min-h-11 rounded-lg border border-ukd-line bg-white px-3">
        <option value="" disabled>इकाई चुनें</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>{"— ".repeat(u.depth)}{u.name}</option>
        ))}
      </select>
      <button disabled={pending}
        className="min-h-11 rounded-lg bg-ukd-green px-4 font-semibold text-white disabled:opacity-60">
        {pending ? "खोल रहे हैं…" : "इस सप्ताह की अवधि खोलें"}
      </button>
    </form>
  );
}
