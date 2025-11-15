"use client";

import React, { useState } from "react";

type ModelId = "gpt" | "claude" | "grok" | "llama";
type DebateMode = "simple" | "full" | "interactive";

type ModelConfig = {
  id: ModelId;
  name: string;
  description: string;
};

const MODELS: ModelConfig[] = [
  { id: "gpt", name: "GPT", description: "قوي في كتابة الكود وإصلاح الأخطاء" },
  {
    id: "claude",
    name: "Claude",
    description: "مميز في التحليل وتبسيط الأفكار",
  },
  {
    id: "grok",
    name: "Grok",
    description: "يعطي ملاحظات مختلفة وغير تقليدية",
  },
  {
    id: "llama",
    name: "Llama",
    description: "خفيف وسريع ويقترح حلول بديلة",
  },
];

type ModelResult = {
  id: ModelId;
  name: string;
  round1: string;
  round2?: string;
  summaryComment?: string;
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState<ModelId[]>(["gpt", "claude"]);
  const [mode, setMode] = useState<DebateMode>("simple");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ModelResult[] | null>(null);
  const [finalSummary, setFinalSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canStart = question.trim().length > 0 && selected.length >= 2;

  const toggleModel = (id: ModelId) => {
    setResults(null);
    setFinalSummary(null);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleStart = async () => {
    if (!canStart || loading) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setFinalSummary(null);

    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          code,
          models: selected,
          mode,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        results: ModelResult[];
        finalSummary?: string;
      };

      setResults(data.results);
      setFinalSummary(data.finalSummary || null);
    } catch (e: any) {
      console.error(e);
      setError(
        "صار خطأ في الاتصال بالسيرفر أو OpenAI. تأكد من المفتاح أو أعد المحاولة."
      );
    } finally {
      setLoading(false);
    }
  };

  const modeLabel: Record<DebateMode, string> = {
    simple: "نقاش بسيط",
    full: "نقاش كامل قوي",
    interactive: "نقاش تفاعلي (3 جولات)",
  };

  const modeDescription: Record<DebateMode, string> = {
    simple: "إجابة مباشرة + ملخص قصير.",
    full: "تشخيص + خطوات مفصلة + أخطاء شائعة + ملخص أعمق.",
    interactive:
      "جولة 1: حلول مبدئية لكل موديل. جولة 2: كل موديل يعلّق ويحسن حله بعد رؤية الآخرين. جولة 3: ذكاء فائق يجمع أفضل الحلول.",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">🧠 نظام نقاش الموديلات المتعددة</h1>
          <p className="text-sm text-slate-400">
            اكتب مشكلتك في الكود أو الفكرة، اختر الموديلات وطريقة النقاش، وشاهد
            كيف يختلف أسلوب كل واحد، ثم كيف يتدخل الذكاء الفائق ليخرج بحل نهائي.
          </p>
        </div>
        <div className="text-xs text-slate-400 text-right">
          <div>
            الموديل الأساسي:{" "}
            <span className="font-semibold text-emerald-400">GPT-5.1 API</span>
          </div>
          <div>الحالة: {loading ? "جارٍ النقاش…" : "جاهز"}</div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        {/* Left side – inputs */}
        <section className="w-full lg:w-1/3 flex flex-col gap-4">
          {/* Question */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold text-sm">🎯 السؤال / المشكلة</h2>
            <textarea
              className="w-full h-32 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="مثال: عندي خطأ في React hook useEffect يظهر لي تحذير عن dependencies..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          {/* Code */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold text-sm">🧩 الكود (اختياري)</h2>
            <textarea
              className="w-full h-40 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="ألصق هنا جزء الكود الذي فيه المشكلة (اختياري)."
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          {/* Debate mode selector */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold text-sm">⚙️ طريقة النقاش</h2>
            <div className="flex flex-col gap-2 text-xs">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  className="mt-0.5"
                  checked={mode === "simple"}
                  onChange={() => setMode("simple")}
                />
                <div>
                  <div className="font-semibold">{modeLabel.simple}</div>
                  <div className="text-[11px] text-slate-400">
                    {modeDescription.simple}
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  className="mt-0.5"
                  checked={mode === "full"}
                  onChange={() => setMode("full")}
                />
                <div>
                  <div className="font-semibold">{modeLabel.full}</div>
                  <div className="text-[11px] text-slate-400">
                    {modeDescription.full}
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  className="mt-0.5"
                  checked={mode === "interactive"}
                  onChange={() => setMode("interactive")}
                />
                <div>
                  <div className="font-semibold">
                    {modeLabel.interactive}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {modeDescription.interactive}
                  </div>
                </div>
              </label>
            </div>
            {mode === "interactive" && (
              <p className="text-[11px] text-emerald-400 mt-1">
                هذا هو وضع C الذي اخترته: 3 جولات مع ذكاء فائق يحكم بين
                الموديلات ويجمع أفضل الحلول.
              </p>
            )}
          </div>

          {/* Model selection + button */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold text-sm">
              🤖 الموديلات المشاركة في النقاش
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {MODELS.map((m) => {
                const active = selected.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleModel(m.id)}
                    className={
                      "rounded-xl border px-2 py-2 text-left transition " +
                      (active
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-900/80 hover:border-slate-500")
                    }
                  >
                    <div className="font-semibold text-sm">{m.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {m.description}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">
              اختر موديلين أو أكثر عشان يكون فيه مقارنة حقيقية بين الأساليب.
            </p>

            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart || loading}
              className={
                "w-full mt-1 rounded-xl px-3 py-2 text-sm font-semibold transition " +
                (canStart && !loading
                  ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed")
              }
            >
              {loading
                ? "الموديلات قاعد تناقش المشكلة..."
                : "ابدأ النقاش بين الموديلات"}
            </button>

            {error && (
              <p className="text-xs text-red-400 mt-2">{error}</p>
            )}
          </div>
        </section>

        {/* Right side – results */}
        <section className="w-full lg:w-2/3 flex flex-col gap-4">
          {/* Model answers */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col">
            <h2 className="font-semibold text-sm mb-3">🗣️ ردود الموديلات</h2>

            {!results && !loading && (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500 text-center px-4">
                اكتب سؤال، اختر الموديلات، واختر{" "}
                <span className="mx-1 font-semibold text-emerald-400">
                  طريقة النقاش
                </span>{" "}
                ثم اضغط{" "}
                <span className="mx-1 font-semibold text-emerald-400">
                  "ابدأ النقاش بين الموديلات"
                </span>{" "}
                لرؤية كيف يختلف أسلوب كل واحد.
              </div>
            )}

            {loading && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-sm text-slate-400 animate-pulse">
                  الموديلات حالياً تعالج السؤال وتبني ردودها…
                </div>
              </div>
            )}

            {results && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-auto max-h-[60vh] pr-1">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 flex flex-col gap-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm">🤖 {r.name}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        مشاركة في النقاش ({modeLabel[mode]})
                      </span>
                    </div>

                    {/* Round 1 */}
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1">
                        🔹 الجولة 1 – الرد الأولي:
                      </div>
                      <pre className="whitespace-pre-wrap bg-slate-900/80 border border-slate-800 rounded-xl p-2 font-mono text-[11px]">
                        {r.round1}
                      </pre>
                    </div>

                    {/* Round 2 (if exists) */}
                    {r.round2 && (
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">
                          🔁 الجولة 2 – بعد رؤية باقي الموديلات:
                        </div>
                        <pre className="whitespace-pre-wrap bg-slate-900/80 border border-slate-800 rounded-xl p-2 font-mono text-[11px]">
                          {r.round2}
                        </pre>
                      </div>
                    )}

                    {/* Short summary/comment */}
                    {r.summaryComment && (
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">
                          🗯️ ملخص أسلوب هذا الموديل:
                        </div>
                        <pre className="whitespace-pre-wrap bg-slate-900/80 border border-slate-800 rounded-xl p-2 font-mono text-[11px]">
                          {r.summaryComment}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Final meta-agent summary */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <h2 className="font-semibold text-sm mb-2">
              🧠 الخلاصة من الذكاء الفائق (Meta-Agent)
            </h2>
            {finalSummary ? (
              <pre className="whitespace-pre-wrap bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs">
                {finalSummary}
              </pre>
            ) : (
              <p className="text-xs text-slate-500">
                عند تشغيل الوضع التفاعلي (3 جولات)، سيقوم الذكاء الفائق بقراءة
                كل ردود الموديلات والجولات، ثم يقدم هنا أفضل حل مجمّع ممكن. في
                الأوضاع الأخرى يمكن اعتبار هذه الخلاصة اختيارية أو فارغة.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
