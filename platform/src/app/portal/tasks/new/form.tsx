"use client";

import { useActionState } from "react";
import { createTaskAction, type ActionState } from "@/server/actions/tasks";

type Unit = { id: string; name: string; type: string; depth: number };

const field =
  "min-h-11 w-full rounded-lg border border-ukd-line bg-white px-3 outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20";

export function NewTaskForm({ units }: { units: Unit[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createTaskAction,
    {},
  );

  return (
    <form action={action} className="grid max-w-2xl gap-5">
      {state.error && (
        <p role="alert" className="rounded-lg border border-ukd-red/30 bg-ukd-red/5 px-4 py-3 text-sm text-ukd-red-dark">
          {state.error}
        </p>
      )}

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">कार्य का शीर्षक</span>
        <input name="title" required className={field} />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">विवरण</span>
        <textarea name="description" rows={4} className={`${field} py-2`} />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">इकाई</span>
        <select name="orgUnitId" required defaultValue="" className={field}>
          <option value="" disabled>इकाई चुनें</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {"— ".repeat(u.depth)}{u.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">प्राथमिकता</span>
          <select name="priority" defaultValue="MEDIUM" className={field}>
            <option value="LOW">निम्न</option>
            <option value="MEDIUM">मध्यम</option>
            <option value="HIGH">उच्च</option>
            <option value="CRITICAL">अत्यावश्यक</option>
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">समय-सीमा</span>
          <input type="date" name="dueAt" className={field} />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-ukd-line bg-white p-4">
        <input type="checkbox" name="cascade" className="mt-1 size-4" />
        <span>
          <span className="font-semibold">अधीनस्थ इकाइयों में भी भेजें</span>
          <span className="mt-0.5 block text-sm text-ukd-mute">
            चुनी गई इकाई के ठीक नीचे की हर इकाई के लिए एक अलग कार्य बनेगा। मूल कार्य तब तक
            बंद नहीं होगा जब तक सभी अधीनस्थ कार्य पूरे न हो जाएँ।
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 justify-self-start rounded-lg bg-ukd-green px-6 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "बना रहे हैं…" : "कार्य बनाएँ"}
      </button>
    </form>
  );
}
