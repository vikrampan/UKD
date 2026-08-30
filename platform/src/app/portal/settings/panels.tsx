"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

const field =
  "min-h-11 w-full rounded-lg border border-ukd-line bg-white px-3 text-center text-lg tracking-widest outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20";

export function MfaPanel({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true); setError(null);
    const res = await fetch("/api/auth/mfa/setup");
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "सेटअप शुरू नहीं हो सका।");
    setSetup({ secret: data.secret, qr: data.qr });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/auth/mfa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "सत्यापन विफल।");
    setSetup(null); setCode("");
    router.refresh();
  }

  async function disable() {
    const entered = window.prompt("बंद करने के लिए वर्तमान छह अंकों का कोड डालें");
    if (!entered) return;
    setBusy(true); setError(null);
    const res = await fetch("/api/auth/mfa/setup", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: entered }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "बंद नहीं हो सका।");
    router.refresh();
  }

  if (enabled) {
    return (
      <div className="max-w-lg rounded-xl border border-ukd-green/30 bg-white p-5">
        <p className="font-semibold text-ukd-green">चालू है</p>
        <p className="mt-1 text-sm text-ukd-mute">
          साइन इन करते समय आपसे प्रमाणक ऐप का छह अंकों का कोड पूछा जाएगा।
        </p>
        {error && <p role="alert" className="mt-3 text-sm text-ukd-red-dark">{error}</p>}
        <button onClick={disable} disabled={busy}
          className="mt-4 min-h-10 rounded-lg border border-ukd-red px-4 text-sm font-semibold text-ukd-red disabled:opacity-60">
          बंद करें
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg rounded-xl border border-ukd-line bg-white p-5">
      {error && <p role="alert" className="mb-3 rounded-lg border border-ukd-red/30 bg-ukd-red/5 px-4 py-3 text-sm text-ukd-red-dark">{error}</p>}

      {!setup ? (
        <>
          <p className="font-semibold">बंद है</p>
          <p className="mt-1 text-sm text-ukd-mute">
            केवल पासवर्ड से खाता सुरक्षित नहीं है। Google Authenticator जैसे किसी ऐप से
            दो-चरणीय सत्यापन चालू करें।
          </p>
          <button onClick={start} disabled={busy}
            className="mt-4 min-h-11 rounded-lg bg-ukd-green px-5 font-semibold text-white disabled:opacity-60">
            {busy ? "तैयार कर रहे हैं…" : "चालू करें"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm">
            <span className="font-semibold">1.</span> प्रमाणक ऐप में यह QR स्कैन करें।
          </p>
          <Image src={setup.qr} alt="MFA QR" width={200} height={200} unoptimized
            className="my-4 rounded-lg border border-ukd-line" />
          <p className="text-sm text-ukd-mute">
            स्कैन न हो पाए तो यह कुंजी हाथ से डालें:
          </p>
          <code className="mt-1 block break-all rounded-lg bg-ukd-paper px-3 py-2 text-sm">{setup.secret}</code>

          <form onSubmit={confirm} className="mt-4 grid gap-3">
            <p className="text-sm">
              <span className="font-semibold">2.</span> ऐप में दिख रहा कोड डालकर पुष्टि करें।
            </p>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric" autoComplete="one-time-code" required className={field} />
            <button disabled={busy}
              className="min-h-11 rounded-lg bg-ukd-green font-semibold text-white disabled:opacity-60">
              {busy ? "जाँच रहे हैं…" : "पुष्टि करें"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export function SessionsPanel({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOutEverywhere() {
    if (!window.confirm("सभी उपकरणों से साइन आउट कर दें? आपको दोबारा साइन इन करना होगा।")) return;
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/sign-in");
  }

  return (
    <div className="max-w-lg rounded-xl border border-ukd-line bg-white p-5">
      <p className="font-semibold tabular-nums">{count} सक्रिय सत्र</p>
      <p className="mt-1 text-sm text-ukd-mute">
        यदि आपको लगे कि किसी और के पास आपके खाते की पहुँच है, तो सभी सत्र समाप्त करें
        और तुरंत पासवर्ड बदलें।
      </p>
      <button onClick={signOutEverywhere} disabled={busy}
        className="mt-4 min-h-10 rounded-lg border border-ukd-line px-4 text-sm font-semibold hover:border-ukd-red hover:text-ukd-red disabled:opacity-60">
        सभी उपकरणों से साइन आउट करें
      </button>
    </div>
  );
}
