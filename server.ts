import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// ----------------------------------------------------------------------------
// Supabase admin client — SERVICE ROLE KEY, server-only, never sent to the
// client. This is the only thing in the whole app allowed to write
// subscription/trial columns on `profiles` (see the RLS migration).
// ----------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

/** Resolves the calling user from the `Authorization: Bearer <token>` header. */
async function getUserFromRequest(req: any): Promise<{ id: string } | null> {
  if (!supabaseAdmin) return null;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id };
}

// ----------------------------------------------------------------------------
// PayPal REST helpers (Subscriptions API)
// ----------------------------------------------------------------------------
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_MODE = process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
const PAYPAL_API_BASE =
  PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";
const PAYPAL_PLAN_ID_MONTHLY = process.env.PAYPAL_PLAN_ID_MONTHLY || "";
// Legacy only — there is no active annual plan. This stays defined purely
// so that if any subscriber from before the pricing change still has a
// yearly PayPal subscription, its webhook events can still be recognized
// and synced correctly rather than erroring out. Never used for new
// subscriptions (the client no longer offers a yearly option at all).
const PAYPAL_PLAN_ID_YEARLY = process.env.PAYPAL_PLAN_ID_YEARLY || "";

let cachedPayPalToken: { token: string; expiresAt: number } | null = null;
async function getPayPalAccessToken(): Promise<string> {
  if (cachedPayPalToken && cachedPayPalToken.expiresAt > Date.now() + 30_000) {
    return cachedPayPalToken.token;
  }
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials are not configured on the server.");
  }
  const basicAuth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const resp = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) {
    throw new Error(`PayPal token request failed: ${resp.status}`);
  }
  const json = await resp.json();
  cachedPayPalToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in || 3600) * 1000,
  };
  return cachedPayPalToken.token;
}

async function paypalFetch(pathname: string, init?: any) {
  const token = await getPayPalAccessToken();
  return fetch(`${PAYPAL_API_BASE}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

/** First-time activation: we know exactly which Supabase user this is (from their auth token). */
async function activateSubscriptionForUser(userId: string, subscriptionId: string) {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured.");

  const resp = await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch PayPal subscription ${subscriptionId}: ${resp.status}`);
  }
  const sub = await resp.json();

  const status = sub.status as string;
  const planId = sub.plan_id as string;
  if (planId !== PAYPAL_PLAN_ID_MONTHLY && planId !== PAYPAL_PLAN_ID_YEARLY) {
    throw new Error("Subscription plan does not match a known Veda plan.");
  }
  if (status !== "ACTIVE" && status !== "APPROVAL_PENDING") {
    throw new Error(`Unexpected subscription status: ${status}`);
  }

  const billing: "monthly" | "yearly" = planId === PAYPAL_PLAN_ID_YEARLY ? "yearly" : "monthly";
  const nextBillingTime: string | null = sub.billing_info?.next_billing_time || null;
  const startTime: string | null = sub.start_time || null;
  const hasPaid = status === "ACTIVE";

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      tier: hasPaid ? "premium" : undefined,
      has_paid_subscription: hasPaid,
      subscription_billing: billing,
      paypal_subscription_id: subscriptionId,
      subscription_status: status,
      current_period_start: startTime,
      current_period_end: nextBillingTime,
      trial_decision: hasPaid ? "subscribed" : undefined,
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to activate PayPal subscription:", error.message);
    throw error;
  }
  return sub;
}

/** Webhook path: we only know the PayPal subscription id, which must already be linked to a profile via activateSubscriptionForUser above. */
async function syncSubscriptionFromPayPal(subscriptionId: string) {
  if (!supabaseAdmin) throw new Error("Supabase admin client not configured.");

  const resp = await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch PayPal subscription ${subscriptionId}: ${resp.status}`);
  }
  const sub = await resp.json();

  const status = sub.status as string; // APPROVAL_PENDING | ACTIVE | SUSPENDED | CANCELLED | EXPIRED
  const planId = sub.plan_id as string;
  const billing: "monthly" | "yearly" = planId === PAYPAL_PLAN_ID_YEARLY ? "yearly" : "monthly";
  const nextBillingTime: string | null = sub.billing_info?.next_billing_time || null;
  const startTime: string | null = sub.start_time || null;
  const hasPaid = status === "ACTIVE";

  const { error, count } = await supabaseAdmin
    .from("profiles")
    .update({
      tier: hasPaid ? "premium" : undefined,
      has_paid_subscription: hasPaid,
      subscription_billing: billing,
      subscription_status: status,
      current_period_start: startTime,
      current_period_end: nextBillingTime,
      trial_decision: hasPaid ? "subscribed" : undefined,
    })
    .eq("paypal_subscription_id", subscriptionId);

  if (error) {
    console.error("Failed to sync PayPal subscription to Supabase:", error.message);
    throw error;
  }
  return sub;
}


let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Resilient Gemini Generator with automatic fallback across candidate models
async function generateGeminiSafe(
  contents: string,
  options?: {
    responseMimeType?: string;
    systemInstruction?: string;
    temperature?: number;
  }
): Promise<string | null> {
  const ai = getAi();
  if (!ai) return null;

  // Candidate models tried in sequence if high-demand (503/429) occurs
  const candidateModels = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config: any = {};
        if (options?.responseMimeType) {
          config.responseMimeType = options.responseMimeType;
        }
        if (options?.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }
        if (options?.temperature !== undefined) {
          config.temperature = options.temperature;
        }

        const response = await ai.models.generateContent({
          model,
          contents,
          config: Object.keys(config).length > 0 ? config : undefined,
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        const status = err?.status || err?.code || "";
        const msg = err?.message || "";
        const isTransient = status === 503 || status === "UNAVAILABLE" || status === 429 || msg.includes("high demand") || msg.includes("quota");

        if (isTransient && attempt === 1) {
          // Quick 300ms pause before second attempt or switching model
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        // Switch to the next candidate model smoothly
        break;
      }
    }
  }

  return null;
}

function parseJsonSafely(text: string | undefined | null, fallback: any = {}): any {
  if (!text) return fallback;
  try {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("JSON parse fallback triggered:", e);
    return fallback;
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: "15mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Veda", timestamp: new Date().toISOString() });
  });

  // AI Daily Plan & Brief
  app.post("/api/gemini/daily-plan", async (req, res) => {
    try {
      const { userContext } = req.body;
      const language = userContext?.language === "ar" ? "ar" : "en";

      const fallbackPlan =
        language === "ar"
          ? {
              brief: "أعطِ الأولوية للمهام الأكاديمية عالية الأثر خلال ساعات الصباح، ونظّم فترات راحتك مع صلواتك اليومية لأقصى صفاء ذهني.",
              schedule: [
                { time: "08:30 ص", title: "أذكار الصباح والتخطيط", tag: "عبادة" },
                { time: "09:30 ص", title: "فترة دراسة عميقة", tag: "دراسة" },
                { time: "01:15 م", title: "صلاة الظهر والراحة", tag: "عبادة" },
                { time: "03:30 م", title: "مراجعة وبطاقات تعليمية", tag: "دراسة" },
                { time: "05:00 م", title: "تأمل العصر", tag: "عبادة" },
              ],
            }
          : {
              brief: "Prioritize high-impact academic tasks during morning hours and align your breaks with daily prayers for maximum mental clarity.",
              schedule: [
                { time: "08:30 AM", title: "Morning Adhkar & Planning", tag: "Worship" },
                { time: "09:30 AM", title: "Deep Study Block", tag: "Study" },
                { time: "01:15 PM", title: "Dhuhr Prayer & Rest", tag: "Worship" },
                { time: "03:30 PM", title: "Review & Flashcards", tag: "Study" },
                { time: "05:00 PM", title: "Asr Reflection", tag: "Worship" },
              ],
            };

      const languageInstruction =
        language === "ar"
          ? "\n\nIMPORTANT: Write the \"brief\" and every schedule \"title\"/\"tag\" entirely in Modern Standard Arabic (فصحى)."
          : "";

      const prompt = `You are Veda, an intelligent, respectful, minimalist personal daily architect.
Analyze the user's data and create an optimized, serene daily plan and brief:
User Context: ${JSON.stringify(userContext || {})}

Return a valid JSON object with:
1. "brief": A calm, 2-3 sentence executive brief summarizing key focus, prayers, and advice.
2. "schedule": An array of 4-7 schedule items { "time": string, "title": string, "tag": "Study" | "Worship" | "Focus" | "Personal" | "Finance" }
Only return the JSON object.${languageInstruction}`;

      const responseText = await generateGeminiSafe(prompt, {
        responseMimeType: "application/json",
      });

      const parsed = parseJsonSafely(responseText, fallbackPlan);
      return res.json(parsed);
    } catch (err: any) {
      console.warn("Daily plan graceful recovery:", err?.message || err);
      const language = req.body?.userContext?.language === "ar" ? "ar" : "en";
      return res.json(
        language === "ar"
          ? {
              brief: "ركّز على أهم أهدافك الدراسية وحافظ على الانتظام في صلواتك اليومية.",
              schedule: [
                { time: "09:00 ص", title: "عمل عميق صباحي", tag: "دراسة" },
                { time: "01:15 م", title: "صلاة الظهر", tag: "عبادة" },
                { time: "04:00 م", title: "مراجعة المواضيع", tag: "دراسة" },
              ],
            }
          : {
              brief: "Focus on your top study goals and maintain consistency in daily prayers.",
              schedule: [
                { time: "09:00 AM", title: "Morning Deep Work", tag: "Study" },
                { time: "01:15 PM", title: "Dhuhr Prayer", tag: "Worship" },
                { time: "04:00 PM", title: "Topic Revision", tag: "Study" },
              ],
            }
      );
    }
  });

  // AI Study Planner & Exam Mode
  app.post("/api/gemini/study-plan", async (req, res) => {
    try {
      const { examName, targetDate, subjects, hoursPerDay, language: reqLanguage } = req.body;
      const language = reqLanguage === "ar" ? "ar" : "en";

      const fallbackPlan =
        language === "ar"
          ? {
              summary: `إطار مراجعة استراتيجي لـ ${examName || "المقرر"}`,
              dailyWorkload: `${hoursPerDay || 2.5} ساعة/يوم`,
              milestones: [
                { phase: "المرحلة ١: الأساسيات", duration: "الأيام ١-٤", topics: ["تعريفات رئيسية", "نظريات أساسية"] },
                { phase: "المرحلة ٢: التطبيق والتدريب", duration: "الأيام ٥-٨", topics: ["مسائل تدريبية", "أسئلة امتحانات سابقة"] },
                { phase: "المرحلة ٣: المراجعة النهائية والمحاكاة", duration: "الأيام ٩-١٠", topics: ["محاكاة امتحان مؤقت", "مراجعة نقاط الضعف"] },
              ],
              suggestedTasks: [
                { title: `ملخصات ${subjects?.[0] || "المادة الأساسية"}`, priority: "high", estimatedMinutes: 45 },
                { title: "حل ١٥ سؤالاً تدريبياً", priority: "medium", estimatedMinutes: 50 },
                { title: "تجميع ورقة المعادلات", priority: "medium", estimatedMinutes: 30 },
              ],
            }
          : {
              summary: `Strategic Revision Framework for ${examName || "Coursework"}`,
              dailyWorkload: `${hoursPerDay || 2.5} hours/day`,
              milestones: [
                { phase: "Phase 1: Core Foundation", duration: "Days 1-4", topics: ["Key definitions", "Fundamental theories"] },
                { phase: "Phase 2: Practice & Application", duration: "Days 5-8", topics: ["Problem sets", "Past paper questions"] },
                { phase: "Phase 3: Final Revision & Mock", duration: "Days 9-10", topics: ["Timed exam simulation", "Weak areas review"] },
              ],
              suggestedTasks: [
                { title: `${subjects?.[0] || "Core Subject"} Summary Notes`, priority: "high", estimatedMinutes: 45 },
                { title: "Solve 15 Practice Questions", priority: "medium", estimatedMinutes: 50 },
                { title: "Formula Sheet Consolidation", priority: "medium", estimatedMinutes: 30 },
              ],
            };

      const languageInstruction =
        language === "ar"
          ? "\n\nIMPORTANT: Write every string value (summary, dailyWorkload, phase, duration, topics, titles) entirely in Modern Standard Arabic (فصحى)."
          : "";

      const prompt = `You are Veda's AI Study Architect. Generate a realistic, highly structured study and exam preparation plan.
Exam: ${examName}
Target Date: ${targetDate}
Subjects / Topics: ${JSON.stringify(subjects || [])}
Hours available per day: ${hoursPerDay || 2}

Return a valid JSON object with:
- "summary": string (calm strategic overview)
- "dailyWorkload": string (e.g. "2.5 hours / day")
- "milestones": array of { "phase": string, "duration": string, "topics": string[] }
- "suggestedTasks": array of { "title": string, "priority": "high" | "medium" | "low", "estimatedMinutes": number }
${languageInstruction}`;

      const responseText = await generateGeminiSafe(prompt, {
        responseMimeType: "application/json",
      });

      const parsed = parseJsonSafely(responseText, fallbackPlan);
      return res.json(parsed);
    } catch (err: any) {
      console.warn("Study plan graceful recovery:", err?.message || err);
      const language = req.body?.language === "ar" ? "ar" : "en";
      return res.json(
        language === "ar"
          ? {
              summary: `خطة تحضير منظمة لـ ${req.body.examName || "الامتحان"}`,
              dailyWorkload: "ساعتان/يوم",
              milestones: [
                { phase: "المرحلة ١: مراجعة المنهج", duration: "الأيام ١-٥", topics: ["الفصول الأساسية"] },
                { phase: "المرحلة ٢: اختبارات تدريبية", duration: "الأيام ٦-١٠", topics: ["مسائل نموذجية"] },
              ],
              suggestedTasks: [{ title: "مراجعة البطاقات التعليمية عالية الأهمية", priority: "high", estimatedMinutes: 30 }],
            }
          : {
              summary: `Structured Prep Plan for ${req.body.examName || "Exam"}`,
              dailyWorkload: "2 hours/day",
              milestones: [
                { phase: "Phase 1: Syllabus Review", duration: "Days 1-5", topics: ["Core chapters"] },
                { phase: "Phase 2: Practice Tests", duration: "Days 6-10", topics: ["Sample problems"] },
              ],
              suggestedTasks: [
                { title: "Review high-yield flashcards", priority: "high", estimatedMinutes: 30 },
              ],
            }
      );
    }
  });

  // AI Flashcards & Quiz Generator
  app.post("/api/gemini/study-materials", async (req, res) => {
    try {
      const { type, content, subject, count = 5 } = req.body;

      const fallbackItems = type === "quiz"
        ? [
            {
              question: `What is a fundamental principle of ${subject || "this topic"}?`,
              options: ["Systematic analysis", "Random estimation", "Unverified claims", "Neglecting constraints"],
              correctIndex: 0,
              explanation: "Systematic analysis ensures rigorous, reproducible understanding.",
            },
          ]
        : [
            {
              front: `Core Concept in ${subject || "Topic"}`,
              back: "A foundational axiom that guides problem-solving and structured comprehension.",
            },
          ];

      const prompt = type === "quiz"
        ? `Create a ${count}-question multiple choice quiz based on this study content for subject '${subject}':
Content: ${content}

Return a JSON object:
{
  "items": [
    {
      "question": string,
      "options": string[] (length 4),
      "correctIndex": number (0-3),
      "explanation": string
    }
  ]
}`
        : `Create ${count} high-yield study flashcards from this study content for subject '${subject}':
Content: ${content}

Return a JSON object:
{
  "items": [
    {
      "front": string (prompt/question),
      "back": string (concise clear answer)
    }
  ]
}`;

      const responseText = await generateGeminiSafe(prompt, {
        responseMimeType: "application/json",
      });

      const parsed = parseJsonSafely(responseText, { items: fallbackItems });
      return res.json(parsed);
    } catch (err: any) {
      console.warn("Study materials graceful recovery:", err?.message || err);
      return res.json({
        items: [
          {
            front: "Key Concept Review",
            back: "Consistent spaced repetition reinforces core retention.",
          },
        ],
      });
    }
  });

  // Ask Document AI
  app.post("/api/gemini/ask-document", async (req, res) => {
    try {
      const { documentName, documentText, question, language: reqLanguage } = req.body;
      const language = reqLanguage === "ar" ? "ar" : "en";

      const fallbackAnswer =
        language === "ar"
          ? `تحليل "${documentName}": بناءً على مقتطفات المستند المقدمة، تتناول النقاط الرئيسية الأطر الأساسية والمنهجيات والاستنتاجات العملية لدراستك.`
          : `Analysis of "${documentName}": Based on the provided document excerpts, the key points address fundamental frameworks, methodologies, and actionable takeaways for your coursework.`;

      const languageInstruction =
        language === "ar" ? "\n\nIMPORTANT: Answer entirely in Modern Standard Arabic (فصحى)." : "";

      const prompt = `You are Veda's Document AI. The user is asking a question grounded in their uploaded study document.
Document Name: ${documentName}
Document Content: ${documentText ? documentText.slice(0, 10000) : "No text extracted"}
User Question: ${question}

Instructions:
1. Ground your answer strictly in the document content.
2. Be concise, clear, and educational.
3. If the answer is not in the document, politely state that.${languageInstruction}`;

      const responseText = await generateGeminiSafe(prompt);

      return res.json({ answer: responseText || fallbackAnswer });
    } catch (err: any) {
      console.warn("Ask document graceful recovery:", err?.message || err);
      const language = req.body?.language === "ar" ? "ar" : "en";
      return res.json({
        answer:
          language === "ar"
            ? "بناءً على المستند المقدم، ركّز على المفاهيم الأساسية والتعريفات المنظمة الواردة في النص."
            : "Based on the provided document, focus on the fundamental concepts and structured definitions outlined in the text.",
      });
    }
  });

  // Finance Insights & Budget Assistant
  app.post("/api/gemini/finance-insights", async (req, res) => {
    try {
      const { expenses, currency = "USD", language: reqLanguage } = req.body;
      const language = reqLanguage === "ar" ? "ar" : "en";
      const budget = req.body.budget || req.body.monthlyBudget || 1000;

      const fallbackInsights =
        language === "ar"
          ? {
              insights: [
                "الإنفاق موزّع على الفئات الحالية.",
                "تخصيص ٢٠٪ للادخار في بداية الشهر يعزز الاستقرار المالي.",
              ],
              alert: null,
              suggestedAllocation: { essentials: "50%", savings: "30%", discretionary: "20%" },
            }
          : {
              insights: [
                "Spending is distributed across current categories.",
                "Allocating 20% to savings early in the month promotes steady financial peace.",
              ],
              alert: null,
              suggestedAllocation: { essentials: "50%", savings: "30%", discretionary: "20%" },
            };

      const languageInstruction =
        language === "ar" ? "\n\nIMPORTANT: Write every string value in the JSON response entirely in Modern Standard Arabic (فصحى)." : "";

      const prompt = `You are Veda's Personal Finance Intelligence. Analyze the user's spending data and budget.
Currency: ${currency}
Budget: ${budget}
Expenses list: ${JSON.stringify(expenses || [])}

Provide calm, objective, constructive observations. Do NOT offer formal investment or financial advice.
Return JSON:
{
  "insights": string[] (2-4 clear, actionable observations),
  "alert": string or null (if budget is exceeded or near limit),
  "suggestedAllocation": { "essentials": string, "savings": string, "discretionary": string }
}${languageInstruction}`;

      const responseText = await generateGeminiSafe(prompt, {
        responseMimeType: "application/json",
      });

      const parsed = parseJsonSafely(responseText, fallbackInsights);
      return res.json(parsed);
    } catch (err: any) {
      console.warn("Finance AI graceful recovery:", err?.message || err);
      return res.json({
        insights: ["Track daily minor expenditures to prevent budget overflow."],
        alert: null,
        suggestedAllocation: { essentials: "50%", savings: "30%", discretionary: "20%" },
      });
    }
  });

  // Global Ask Veda / Islamic AI / Assistant
  app.post("/api/gemini/ask-veda", async (req, res) => {
    try {
      const { message, mode = "general", context = {} } = req.body;
      const language = context?.language === "ar" ? "ar" : "en";

      const fallbackReply =
        language === "ar"
          ? mode === "islamic"
            ? "الحفاظ على الانتظام في الصلوات المفروضة اليومية والأذكار الصباحية والمسائية يجلب الطمأنينة إلى جدولك. للأحكام الشرعية المحددة، يرجى الرجوع إلى العلماء الموثوقين."
            : "فيدا هنا لمساعدتك على مواءمة دراستك وعبادتك وتركيزك اليومي الشخصي في إيقاع هادئ ومنتج."
          : mode === "islamic"
          ? "Maintaining consistency in your daily obligatory prayers and morning/evening adhkar creates tranquility in your schedule. For specific legal rulings, please consult trusted scholars."
          : "Veda is here to help you harmonize your study, worship, and personal daily focus into a serene, productive rhythm.";

      const languageInstruction =
        language === "ar"
          ? "\n\nIMPORTANT: Respond entirely in Modern Standard Arabic (فصحى), regardless of what language the user's message is written in, unless they explicitly ask for another language."
          : "";

      const systemInstruction =
        (mode === "islamic"
          ? `You are Veda's Faith & Worship Assistant.
Guidelines:
1. Assist with worship routines, Ramadan planning, Quran reflection prompts, and daily spiritual organization.
2. NEVER issue fatwas, pretend to be an authoritative Islamic scholar, or fabricate Hadith or Quranic verses.
3. Be respectful, encouraging, calm, and humble.
4. For legal/jurisprudential questions, always advise consulting qualified scholars.`
          : `You are Veda, an elegant, minimalist personal life and study architect.
You help the user coordinate their study tasks, focus sessions, prayer times, personal finance, and goals into a unified, harmonious routine.
Keep answers concise, actionable, and formatted in clean Markdown.`) + languageInstruction;

      const responseText = await generateGeminiSafe(message, {
        systemInstruction,
      });

      return res.json({ reply: responseText || fallbackReply });
    } catch (err: any) {
      console.warn("Ask Veda graceful recovery:", err?.message || err);
      const language = req.body?.context?.language === "ar" ? "ar" : "en";
      return res.json({
        reply:
          language === "ar"
            ? "فيدا يعطي الأولوية لجدولك وتركيزك. استمر في مهام دراستك الأساسية وإيقاع الصلاة اليومي الواعي."
            : "Veda is prioritizing your schedule and focus. Continue with your primary study tasks and mindful daily prayer rhythm.",
      });
    }
  });

  // ----------------------------------------------------------------------
  // Account & Subscription endpoints
  // ----------------------------------------------------------------------

  // Called right after the PayPal button's onApprove fires client-side.
  // We independently re-verify the subscription with PayPal (never trust
  // the client's word alone) before granting premium.
  app.post("/api/paypal/verify-subscription", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Server is not configured with Supabase credentials." });
      }
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated." });
      }
      const { subscriptionID } = req.body || {};
      if (!subscriptionID || typeof subscriptionID !== "string") {
        return res.status(400).json({ error: "Missing subscriptionID." });
      }

      const sub = await activateSubscriptionForUser(user.id, subscriptionID);
      return res.json({ ok: true, status: sub.status });
    } catch (err: any) {
      console.error("verify-subscription error:", err?.message || err);
      return res.status(400).json({ error: err?.message || "Could not verify subscription." });
    }
  });

  // PayPal webhook — the durable source of truth for renewals, cancellations,
  // suspensions, and expirations, independent of whether the user's device
  // is even online at the time.
  app.post("/api/paypal/webhook", async (req, res) => {
    try {
      if (!PAYPAL_WEBHOOK_ID) {
        console.warn("PAYPAL_WEBHOOK_ID not configured — rejecting webhook.");
        return res.status(500).send("Webhook not configured");
      }

      const verifyResp = await paypalFetch("/v1/notifications/verify-webhook-signature", {
        method: "POST",
        body: JSON.stringify({
          auth_algo: req.headers["paypal-auth-algo"],
          cert_url: req.headers["paypal-cert-url"],
          transmission_id: req.headers["paypal-transmission-id"],
          transmission_sig: req.headers["paypal-transmission-sig"],
          transmission_time: req.headers["paypal-transmission-time"],
          webhook_id: PAYPAL_WEBHOOK_ID,
          webhook_event: req.body,
        }),
      });
      const verifyJson = await verifyResp.json();
      if (verifyJson.verification_status !== "SUCCESS") {
        console.warn("PayPal webhook signature verification failed.");
        return res.status(400).send("Invalid signature");
      }

      const eventType = req.body?.event_type as string;
      const subscriptionId: string | undefined =
        req.body?.resource?.id ||
        req.body?.resource?.billing_agreement_id ||
        req.body?.resource?.subscription_id;

      const relevantEvents = new Set([
        "BILLING.SUBSCRIPTION.ACTIVATED",
        "BILLING.SUBSCRIPTION.UPDATED",
        "BILLING.SUBSCRIPTION.CANCELLED",
        "BILLING.SUBSCRIPTION.SUSPENDED",
        "BILLING.SUBSCRIPTION.EXPIRED",
        "PAYMENT.SALE.COMPLETED",
      ]);

      if (subscriptionId && relevantEvents.has(eventType)) {
        // Re-fetching canonical state from PayPal rather than trusting the
        // webhook payload shape directly is deliberate — it's correct
        // regardless of which event type variant PayPal sends.
        await syncSubscriptionFromPayPal(subscriptionId);
      }

      return res.status(200).send("OK");
    } catch (err: any) {
      console.error("PayPal webhook error:", err?.message || err);
      // Still 200 so PayPal doesn't hammer retries for a transient error on
      // our side once logged; adjust to 500 if you'd rather have PayPal retry.
      return res.status(200).send("Received");
    }
  });

  // Lets a signed-in user voluntarily end their trial/decline premium early.
  // Safe to run client-triggered because it can only ever reduce access.
  app.post("/api/account/decline-trial", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Server is not configured with Supabase credentials." });
      }
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated." });
      }
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ tier: "free", has_paid_subscription: false, trial_decision: "free" })
        .eq("id", user.id);
      if (error) throw error;
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("decline-trial error:", err?.message || err);
      return res.status(400).json({ error: err?.message || "Could not update account." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Veda server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();