import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

console.log("ENV OPENAI_API_KEY exists? ->", !!apiKey);

const openai = new OpenAI({
  apiKey,
});

type ModelId = "gpt" | "claude" | "grok" | "llama";
type DebateMode = "simple" | "full" | "interactive";

const MODEL_NAMES: Record<ModelId, string> = {
  gpt: "GPT",
  claude: "Claude",
  grok: "Grok",
  llama: "Llama",
};

const SYSTEM_PROMPTS: Record<ModelId, string> = {
  gpt: "You are GPT, a strict senior coding expert. Focus on correct, production-grade solutions.",
  claude: "You are Claude, a thoughtful analyst. Focus on reasoning, structure, and edge cases.",
  grok: "You are Grok, witty and sharp. Point out weird edge cases and hidden problems others may miss.",
  llama: "You are Llama, simple and practical. Suggest short, robust improvements that are easy to implement.",
};

type ModelRoundResult = {
  id: ModelId;
  name: string;
  round1: string; // الإجابة الأولى
  round2?: string; // تعليق/تحسين بعد رؤية باقي الموديلات
  summaryComment?: string; // تعليق قصير
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, code, models, mode } = body as {
      question: string;
      code?: string;
      models: ModelId[];
      mode?: DebateMode;
    };

    const debateMode: DebateMode = mode ?? "simple";

    if (!question || !Array.isArray(models) || models.length < 1) {
      return NextResponse.json(
        { error: "يجب إرسال سؤال ومصفوفة موديلات." },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "مفتاح OPENAI_API_KEY غير موجود في .env.local!" },
        { status: 500 }
      );
    }

    const baseContext =
      `السؤال:\n${question}\n\n` +
      (code ? `الكود:\n${code}\n\n` : "");

    // === بناء برومبت الجولة الأولى حسب نوع النقاش ===
    function buildRound1Prompt(mode: DebateMode) {
      if (mode === "simple") {
        return (
          baseContext +
          "\n\nأجب بإجابة واحدة واضحة ومباشرة لحل المشكلة.\n" +
          "قسّم الحل إلى خطوات مرقمة إن احتجت.\n\n" +
          "بعد أن تنهي الحل، اكتب السطر التالي لوحده:\n---SUMMARY---\n" +
          "ثم اكتب سطرًا واحدًا فقط يلخص أهم نقطة في الحل."
        );
      }

      if (mode === "full") {
        return (
          baseContext +
          "\n\nأجب بإجابة مفصلة وقسّمها إلى الأقسام التالية:\n" +
          "1) تشخيص المشكلة المحتملة.\n" +
          "2) خطوات الحل خطوة خطوة.\n" +
          "3) أخطاء شائعة يجب تجنبها.\n\n" +
          "بعد أن تنهي الأقسام، اكتب السطر التالي لوحده:\n---SUMMARY---\n" +
          "ثم اكتب سطرين كحد أقصى يلخصان أفضل ما في حلك."
        );
      }

      // interactive – الجولة الأولى من النقاش القوي
      return (
        baseContext +
        "\n\nهذه هي الجولة 1 من نقاش بين عدة خبراء.\n" +
        "1) اكتب حلك أنت أولاً بشكل منظم وواضح.\n" +
        "2) اذكر نقطتين تعتبرهما أقوى ما في حلك.\n" +
        "3) اذكر نقطة واحدة قد ينتقدك فيها خبير آخر.\n\n" +
        "بعد أن تنهي الإجابة، اكتب السطر التالي لوحده:\n---SUMMARY---\n" +
        "ثم اكتب سطرًا واحدًا يعرّف أسلوبك (مثلاً: \"أركز على البساطة على حساب التعقيد\")."
      );
    }

    // ========== الجولة الأولى: كل موديل يجاوب لوحده ==========
    const round1Results: ModelRoundResult[] = [];

    for (const id of models) {
      const systemPrompt = SYSTEM_PROMPTS[id];
      const userPrompt = buildRound1Prompt(debateMode);

      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const full =
        completion.choices[0]?.message?.content ||
        "لم يصل رد من الموديل.";

      const [answerPart, summaryPart] = full.split("---SUMMARY---");

      round1Results.push({
        id,
        name: MODEL_NAMES[id],
        round1: (answerPart || "").trim(),
        summaryComment: (summaryPart || "").trim(),
      });
    }

    // لو mode بسيط أو كامل فقط → نرجع الجولة الأولى كما هي
    if (debateMode !== "interactive") {
      return NextResponse.json({ results: round1Results });
    }

    // ========== من هنا يبدأ C: نقاش قوي من 3 جولات ==========

    // نبني سياق النقاش من الجولة الأولى
    const debateContextRound1 = round1Results
      .map(
        (r, idx) =>
          `الخبير رقم ${idx + 1} (${r.name}):\n${r.round1}\n\nملخص أسلوبه: ${
            r.summaryComment || "لا يوجد"
          }`
      )
      .join("\n\n====================\n\n");

    // === الجولة الثانية: كل موديل يشوف ردود الآخرين ويعلّق / يحسن حله ===
    const round2Results: ModelRoundResult[] = [];

    for (const r of round1Results) {
      const systemPrompt = SYSTEM_PROMPTS[r.id];
      const userPromptRound2 =
        baseContext +
        "\n\nهذه هي ردود الخبراء الآخرين في الجولة 1:\n\n" +
        debateContextRound1 +
        "\n\nأنت الآن الخبير: " +
        r.name +
        ".\n" +
        "الجولة 2 – مهمتك:\n" +
        "1) قيّم بإيجاز (بنقاط) ما يعجبك وما لا يعجبك في ردود باقي الخبراء.\n" +
        "2) قم بتحسين حلك الأصلي بناءً على أفضل أفكار الآخرين.\n" +
        "3) إذا وجدت خطأ واضحاً أو سوء فهم عند أي خبير، وضّحه بأدب.\n\n" +
        "اجعل إجابتك مقسمة إلى:\n" +
        "أ) تقييم مختصر للآخرين.\n" +
        "ب) نسخة محسنة من حلك.\n";

      const completion2 = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPromptRound2 },
        ],
      });

      const full2 =
        completion2.choices[0]?.message?.content ||
        "لم يصل رد من الموديل في الجولة الثانية.";

      round2Results.push({
        ...r,
        round2: full2.trim(),
      });
    }

    // نبني سياق شامل للجولتين لإعطاءه للحَكَم النهائي
    const judgeContext = round2Results
      .map(
        (r, idx) =>
          `الخبير رقم ${idx + 1} (${r.name}):\n\n` +
          `[الجولة 1 – الحل الأولي]\n${r.round1}\n\n` +
          `[الجولة 2 – التقييم والتحسين]\n${r.round2 || ""}\n`
      )
      .join("\n\n====================\n\n");

    // === الجولة الثالثة: الحَكَم (الذكاء الفائق) يخرج الخلاصة النهائية ===
    const judgeCompletion = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        {
          role: "system",
          content:
            "أنت ذكاء فائق (Meta-Agent) وظيفتك الحكم بين خبراء متعددين في البرمجة وتحليل الكود. " +
            "يجب أن تجمع أفضل ما في حلولهم، وتكشف أي أخطاء أو نقاط ضعف، ثم تخرج بحل نهائي أقوى منهم جميعاً.",
        },
        {
          role: "user",
          content:
            baseContext +
            "\n\nهذه هي تفاصيل النقاش بين الخبراء (الجولة 1 والجولة 2):\n\n" +
            judgeContext +
            "\n\nمهمتك:\n" +
            "1) لخص بإيجاز ما اتفق عليه معظم الخبراء.\n" +
            "2) اذكر أهم نقطتين اختلفوا حولهما.\n" +
            "3) قدّم حلاً نهائياً واحداً، منظمًا وواضحًا، يجمع أفضل ما في حلولهم ويتجنب عيوبها.\n" +
            "4) إن كان هناك أكثر من خيار قوي، اذكر متى نفضّل كل خيار.\n",
        },
      ],
    });

    const finalSummary =
      judgeCompletion.choices[0]?.message?.content ||
      "تعذر توليد خلاصة من الذكاء الفائق.";

    return NextResponse.json({
      results: round2Results, // تحتوي الجولة 1 + 2
      finalSummary,
    });
  } catch (err) {
    console.error("ERROR in /api/debate:", err);
    return NextResponse.json(
      { error: "خطأ من السيرفر أثناء الاتصال بـ OpenAI." },
      { status: 500 }
    );
  }
}
