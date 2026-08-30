"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "password" | "mfa";

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return setError(data.error ?? "साइन इन नहीं हो सका।");
    if (data.mfaRequired) {
      setChallenge(data.challenge);
      setStep("mfa");
      return;
    }
    router.push("/portal");
  }

  async function submitMfa(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/auth/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge, code }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return setError(data.error ?? "सत्यापन विफल।");
    router.push("/portal");
  }

  return (
    <main className="min-h-dvh grid lg:grid-cols-2">
      {/* Brand panel — hidden on phones, where the form should own the screen */}
      <div className="hidden lg:flex flex-col justify-between bg-ukd-green-deep text-white p-12">
        <div className="h-1 w-24 bg-gradient-to-r from-ukd-green to-ukd-red rounded" />
        <div>
          <h1 className="text-4xl font-bold mb-4">उत्तराखंड क्रांति दल</h1>
          <p className="text-lg text-white/70 max-w-md">
            संगठन पोर्टल — कार्य, इकाइयाँ, जन समस्याएँ और रिपोर्ट, एक ही जगह।
          </p>
        </div>
        <p className="text-sm text-white/50">केवल अधिकृत पदाधिकारियों हेतु।</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-1">
            {step === "password" ? "साइन इन करें" : "सत्यापन कोड"}
          </h2>
          <p className="text-ukd-mute mb-8">
            {step === "password"
              ? "अपना पंजीकृत मोबाइल नंबर और पासवर्ड डालें।"
              : "अपने प्रमाणक ऐप में दिख रहा छह अंकों का कोड डालें।"}
          </p>

          {error && (
            <p
              role="alert"
              className="mb-5 rounded-lg border border-ukd-red/30 bg-ukd-red/5 px-4 py-3 text-sm text-ukd-red-dark"
            >
              {error}
            </p>
          )}

          {step === "password" ? (
            <form onSubmit={submitPassword} className="grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">मोबाइल नंबर</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  autoComplete="username"
                  required
                  className="min-h-11 rounded-lg border border-ukd-line bg-white px-3 outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">पासवर्ड</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="min-h-11 rounded-lg border border-ukd-line bg-white px-3 outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20"
                />
              </label>

              <button
                type="submit"
                disabled={busy}
                className="mt-2 min-h-11 rounded-lg bg-ukd-green font-semibold text-white disabled:opacity-60"
              >
                {busy ? "प्रतीक्षा करें…" : "साइन इन करें"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitMfa} className="grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold">छह अंकों का कोड</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  className="min-h-11 rounded-lg border border-ukd-line bg-white px-3 text-center text-xl tracking-widest outline-none focus:border-ukd-green focus:ring-2 focus:ring-ukd-green/20"
                />
              </label>

              <button
                type="submit"
                disabled={busy}
                className="mt-2 min-h-11 rounded-lg bg-ukd-green font-semibold text-white disabled:opacity-60"
              >
                {busy ? "जाँच रहे हैं…" : "सत्यापित करें"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("password"); setCode(""); setError(null); }}
                className="text-sm text-ukd-mute underline underline-offset-4"
              >
                ← वापस जाएँ
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
