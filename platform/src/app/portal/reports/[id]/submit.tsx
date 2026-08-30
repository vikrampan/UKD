"use client";

import { useActionState } from "react";
import { submitReportAction, type ReportState } from "@/server/actions/reports";

const num =
  "min-h-11 w-full rounded-lg border border-ukd-line bg-white px-3 outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20";

export function SubmitReport({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReportAction, {});

  if (state.ok) {
    return <p className="mt-3 text-sm font-semibold text-ukd-green">रिपोर्ट जमा हो गई।</p>;
  }

  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="reportId" value={reportId} />
      {state.error && (
        <p role="alert" className="text-sm text-ukd-red-dark">{state.error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-ukd-mute">बैठकें</span>
          <input name="meetings" type="number" min={0} defaultValue={0} required className={num} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-ukd-mute">गतिविधियाँ</span>
          <input name="activities" type="number" min={0} defaultValue={0} required className={num} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-ukd-mute">नए सदस्य</span>
          <input name="newMembers" type="number" min={0} defaultValue={0} required className={num} />
        </label>
      </div>
      <input name="notes" placeholder="टिप्पणी (वैकल्पिक)" className={num} />
      <button disabled={pending}
        className="min-h-10 justify-self-start rounded-lg bg-ukd-green px-4 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "जमा कर रहे हैं…" : "रिपोर्ट जमा करें"}
      </button>
    </form>
  );
}
