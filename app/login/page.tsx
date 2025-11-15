"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || "حدث خطأ، حاول مرة أخرى");
        setLoading(false);
        return;
      }

      // نجاح: نرجع للهوم
      window.location.href = "/";
    } catch (err) {
      setError("مشكلة في الاتصال، تأكد من الإنترنت");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <div className="w-full max-w-sm bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-semibold mb-4 text-center">
          تسجيل دخول
        </h1>
        <p className="text-sm text-slate-300 mb-4 text-center">
          الموقع محمي، أدخل كلمة السر للمتابعة
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">كلمة السر</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة السر"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60 py-2 text-sm font-medium"
          >
            {loading ? "جاري التحقق..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
