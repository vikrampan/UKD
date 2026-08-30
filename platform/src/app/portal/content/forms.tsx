"use client";

import { useActionState } from "react";
import {
  createEventAction, addDocumentAction, writeAnnouncementAction, type ContentState,
} from "@/server/actions/content";

type Unit = { id: string; name: string; depth: number };

const field =
  "min-h-11 w-full rounded-lg border border-ukd-line bg-white px-3 outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20";

function Notice({ state }: { state: ContentState }) {
  if (state.error)
    return <p role="alert" className="rounded-lg border border-ukd-red/30 bg-ukd-red/5 px-4 py-3 text-sm text-ukd-red-dark">{state.error}</p>;
  if (state.ok)
    return <p className="rounded-lg border border-ukd-green/30 bg-ukd-green/5 px-4 py-3 text-sm text-ukd-green">{state.ok}</p>;
  return null;
}

function UnitSelect({ units }: { units: Unit[] }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold">इकाई</span>
      <select name="orgUnitId" required defaultValue="" className={field}>
        <option value="" disabled>इकाई चुनें</option>
        {units.map((u) => <option key={u.id} value={u.id}>{"— ".repeat(u.depth)}{u.name}</option>)}
      </select>
    </label>
  );
}

/** Publishing is always explicit — nothing reaches the public site by default. */
function PublicToggle({ name, label, hint }: { name: string; label: string; hint: string }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-ukd-line bg-white p-4">
      <input type="checkbox" name={name} className="mt-1 size-4" />
      <span>
        <span className="font-semibold">{label}</span>
        <span className="mt-0.5 block text-sm text-ukd-mute">{hint}</span>
      </span>
    </label>
  );
}

export function EventForm({ units }: { units: Unit[] }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(createEventAction, {});
  return (
    <form action={action} className="grid gap-4 rounded-xl border border-ukd-line bg-white p-5">
      <Notice state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5"><span className="text-sm font-semibold">शीर्षक</span>
          <input name="title" required className={field} /></label>
        <label className="grid gap-1.5"><span className="text-sm font-semibold">प्रकार</span>
          <input name="kind" placeholder="बैठक / शिविर / प्रशिक्षण" required className={field} /></label>
        <label className="grid gap-1.5"><span className="text-sm font-semibold">स्थान</span>
          <input name="venue" required className={field} /></label>
        <label className="grid gap-1.5"><span className="text-sm font-semibold">दिनांक व समय</span>
          <input type="datetime-local" name="startsAt" required className={field} /></label>
      </div>
      <label className="grid gap-1.5"><span className="text-sm font-semibold">विवरण</span>
        <textarea name="description" rows={3} required className={`${field} py-2`} /></label>
      <UnitSelect units={units} />
      <PublicToggle name="isPublic" label="सार्वजनिक वेबसाइट पर दिखाएँ"
        hint="चुनने पर यह कार्यक्रम दल की सार्वजनिक वेबसाइट पर सबको दिखेगा।" />
      <button disabled={pending} className="min-h-11 justify-self-start rounded-lg bg-ukd-green px-6 font-semibold text-white disabled:opacity-60">
        {pending ? "जोड़ रहे हैं…" : "कार्यक्रम जोड़ें"}
      </button>
    </form>
  );
}

export function DocumentForm({ units }: { units: Unit[] }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(addDocumentAction, {});
  return (
    <form action={action} className="grid gap-4 rounded-xl border border-ukd-line bg-white p-5">
      <Notice state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5"><span className="text-sm font-semibold">शीर्षक</span>
          <input name="title" required className={field} /></label>
        <label className="grid gap-1.5"><span className="text-sm font-semibold">श्रेणी</span>
          <input name="category" placeholder="प्रस्ताव / कार्यवृत्त / प्रेस विज्ञप्ति" required className={field} /></label>
      </div>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">फ़ाइल का लिंक</span>
        <input name="url" type="url" placeholder="https://…" className={field} />
        <span className="text-xs text-ukd-mute">
          फ़ाइल भंडारण अभी जुड़ा नहीं है — फ़िलहाल दस्तावेज़ का लिंक दें।
        </span>
      </label>
      <UnitSelect units={units} />
      <PublicToggle name="isPublic" label="सार्वजनिक वेबसाइट पर दिखाएँ"
        hint="चुनने पर यह दस्तावेज़ सबके लिए उपलब्ध होगा।" />
      <button disabled={pending} className="min-h-11 justify-self-start rounded-lg bg-ukd-green px-6 font-semibold text-white disabled:opacity-60">
        {pending ? "जोड़ रहे हैं…" : "दस्तावेज़ जोड़ें"}
      </button>
    </form>
  );
}

export function AnnouncementForm({ units }: { units: Unit[] }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(writeAnnouncementAction, {});
  return (
    <form action={action} className="grid gap-4 rounded-xl border border-ukd-line bg-white p-5">
      <Notice state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5"><span className="text-sm font-semibold">शीर्षक</span>
          <input name="title" required className={field} /></label>
        <label className="grid gap-1.5"><span className="text-sm font-semibold">श्रेणी</span>
          <input name="tag" placeholder="आधिकारिक सूचना / प्रेस / जन कार्य" required className={field} /></label>
      </div>
      <label className="grid gap-1.5"><span className="text-sm font-semibold">संक्षिप्त विवरण</span>
        <textarea name="excerpt" rows={2} required className={`${field} py-2`} /></label>
      <label className="grid gap-1.5"><span className="text-sm font-semibold">पूरा लेख</span>
        <textarea name="body" rows={8} required className={`${field} py-2`} /></label>
      <UnitSelect units={units} />
      <PublicToggle name="publish" label="तुरंत प्रकाशित करें"
        hint="न चुनने पर यह प्रारूप के रूप में सुरक्षित रहेगा।" />
      <button disabled={pending} className="min-h-11 justify-self-start rounded-lg bg-ukd-green px-6 font-semibold text-white disabled:opacity-60">
        {pending ? "सुरक्षित कर रहे हैं…" : "सूचना सुरक्षित करें"}
      </button>
    </form>
  );
}
