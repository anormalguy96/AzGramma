import type { Handler } from "@netlify/functions";
import { z } from "zod";

import { json } from "./_shared/http";
import { requireAuth } from "./_shared/auth";
import { supabaseAdmin } from "./_shared/supabaseAdmin";
import { getMonthlyLimit, type Plan } from "./_shared/plans";

const Vibe = z.enum(["Academic", "Casual", "Professional", "Literature"]);

const ReqSchema = z.object({
  text: z.string().min(1).max(10_000),
  // support BOTH shapes: old (task) and new (mode)
  task: z.enum(["fix", "rewrite"]).optional(),
  mode: z.enum(["fix", "rewrite"]).optional(),
  vibe: Vibe.optional(),
  variants: z.boolean().optional(),
});

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct";
const OLLAMA_KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || "10m";
const OLLAMA_NUM_PREDICT = Number(process.env.OLLAMA_NUM_PREDICT || "180");

function currentMonthKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// fixes occasional Cyrillic leaks like: sənədlərимi
function normalizeCyrillicConfusables(s: string): string {
  const map: Record<string, string> = {
    А: "A", а: "a",
    В: "B", в: "b",
    Е: "E", е: "e",
    К: "K", к: "k",
    М: "M", м: "m",
    О: "O", о: "o",
    Р: "P", р: "p",
    С: "C", с: "c",
    Т: "T", т: "t",
    Х: "X", х: "x",
    У: "Y", у: "y",
    И: "I", и: "i",
    Ј: "J", ј: "j",
  };
  return s.replace(/[\u0400-\u04FF]/g, (ch) => map[ch] ?? ch);
}

async function bumpUsage(userId: string, month: string) {
  const { data, error } = await supabaseAdmin
    .from("usage_monthly")
    .select("requests_count")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();

  if (error) throw error;

  const next = (data?.requests_count ?? 0) + 1;

  const { error: upErr } = await supabaseAdmin
    .from("usage_monthly")
    .upsert({ user_id: userId, month, requests_count: next }, { onConflict: "user_id,month" });

  if (upErr) throw upErr;
}

function buildInstruction(task: "fix" | "rewrite", vibe: string) {
  if (task === "rewrite") {
    return [
      "You are a STRICT Azerbaijani (az) rewriting assistant.",
      `Rewrite the text in Azerbaijani in a ${vibe} vibe.`,
      "RULES:",
      "- Output MUST be Azerbaijani (az). Never Turkish/English/Russian.",
      "- Keep meaning. Do NOT add new info.",
      "- Restore Azerbaijani letters (ə, ı, ö, ü, ğ, ş, ç) when appropriate.",
      "- Output ONLY the rewritten text. No explanations. No quotes. No markdown.",
    ].join("\n");
  }

  // fix
  return [
    "You are a STRICT Azerbaijani (az) grammar/spelling/punctuation corrector.",
    "RULES:",
    "- Do NOT translate.",
    "- Output MUST be Azerbaijani (az). Never Turkish/English/Russian.",
    "- Keep meaning. Do NOT add new info.",
    "- Restore Azerbaijani letters (ə, ı, ö, ü, ğ, ş, ç) when appropriate.",
    "- Output ONLY the corrected text. No explanations. No quotes. No markdown.",
    "",
    "EXAMPLE:",
    "IN : Salam men size yaziram cunki senedlerimi gondermek isteyirem.",
    "OUT: Salam, mən sizə yazıram, çünki sənədlərimi göndərmək istəyirəm.",
  ].join("\n");
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { message: "Method not allowed" });

    const { userId } = await requireAuth(event);

    // Plan + limit
    const { data: prof, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();

    if (profErr) throw profErr;

    const plan = (prof?.plan ?? "free") as Plan;
    const limit = getMonthlyLimit(plan);

    const month = currentMonthKey();
    const { data: usageRow, error: usageErr } = await supabaseAdmin
      .from("usage_monthly")
      .select("requests_count")
      .eq("user_id", userId)
      .eq("month", month)
      .maybeSingle();

    if (usageErr) throw usageErr;

    const used = usageRow?.requests_count ?? 0;
    if (used >= limit) {
      return json(402, { message: `Monthly limit reached (${used}/${limit}).` });
    }

    const body = ReqSchema.parse(JSON.parse(event.body ?? "{}"));
    const task = (body.task ?? body.mode ?? "fix") as "fix" | "rewrite";
    const vibe = body.vibe ?? "Professional";

    const instruction = buildInstruction(task, vibe);

    const resp = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        keep_alive: OLLAMA_KEEP_ALIVE,
        options: {
          temperature: 0.1,
          num_predict: OLLAMA_NUM_PREDICT,
          top_p: 0.9,
        },
        messages: [
          { role: "system", content: "Only Azerbaijani (az). Output only the final text." },
          { role: "user", content: `${instruction}\n\nTEXT:\n${body.text}` },
        ],
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return json(resp.status, { message: "Ollama error", details: data });
    }

    let out = String(data?.message?.content ?? "").trim();
    out = out.replace(/^["'`]+|["'`]+$/g, ""); // strip accidental quotes
    out = normalizeCyrillicConfusables(out);

    if (!out) return json(500, { message: "Ollama returned no text", details: data });

    await bumpUsage(userId, month);

    // return BOTH shapes so your frontend won’t break either way
    return json(200, {
      result: out,
      correctedText: out,
      issues: [],
      variants: {},
    });
  } catch (e) {
    return json(400, { message: e instanceof Error ? e.message : "Unknown error" });
  }
};