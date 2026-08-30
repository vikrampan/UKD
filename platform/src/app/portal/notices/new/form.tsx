"use client";

import { useActionState } from "react";
import { issueNoticeAction, type NoticeState } from "@/server/actions/notices";

const field =
  "min-h-11 w-full rounded-lg border border-ukd-line bg-white px-3 outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20";

export function NoticeForm({ units }: { units: { id: string; name: string; depth: number }[] }) {
  const [state, action, pending] = useActionState<NoticeState, FormData>(issueNoticeAction, {});

  return (
    <form action={action} className="grid max-w-2xl gap-5">
      {state.error && (
        <p role="alert" className="rounded-lg border border-ukd-red/30 bg-ukd-red/5 px-4 py-3 text-sm text-ukd-red-dark">
          {state.error}
        </p>
      )}

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">शीर्षक</span>
        <input name="title" required className={field} />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">विवरण</span>
        <textarea name="body" rows={6} required className={`${field} py-2`} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">किस इकाई को</span>
          <select name="orgUnitId" required defaultValue="" className={field}>
            <option value="" disabled>इकाई चुनें</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{"— ".repeat(u.depth)}{u.name}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">अंतिम तिथि</span>
          <input type="date" name="dueAt" className={field} />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-ukd-line bg-white p-4">
        <input type="checkbox" name="requiresAck" defaultChecked className="mt-1 size-4" />
        <span>
          <span className="font-semibold">पावती आवश्यक</span>
          <span className="mt-0.5 block text-sm text-ukd-mute">
            केवल खोलना पर्याप्त नहीं — प्राप्तकर्ता को स्पष्ट रूप से पावती देनी होगी।
          </span>
        </span>
      </label>

      <button type="submit" disabled={pending}
        className="min-h-11 justify-self-start rounded-lg bg-ukd-green px-6 font-semibold text-white disabled:opacity-60">
        {pending ? "जारी कर रहे हैं…" : "सूचना जारी करें"}
      </button>
    </form>
  );
}
