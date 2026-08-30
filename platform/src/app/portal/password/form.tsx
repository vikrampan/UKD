"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const field =
  "min-h-11 w-full rounded-lg border border-ukd-line bg-white px-3 outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20";

export function PasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return setError(data.error ?? "पासवर्ड नहीं बदला जा सका।");
    router.push("/portal");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {error && (
        <p role="alert" className="rounded-lg border border-ukd-red/30 bg-ukd-red/5 px-4 py-3 text-sm text-ukd-red-dark">
          {error}
        </p>
      )}
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">वर्तमान पासवर्ड</span>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password" required className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">नया पासवर्ड</span>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password" required className={field} />
      </label>
      <button type="submit" disabled={busy}
        className="mt-2 min-h-11 rounded-lg bg-ukd-green font-semibold text-white disabled:opacity-60">
        {busy ? "बदल रहे हैं…" : "पासवर्ड बदलें"}
      </button>
    </form>
  );
}
