import type { Handler } from "@netlify/functions";
import { bad, ok } from "./_shared/http";

type Body = {
  mode: "fix" | "rewrite";
  vibe: "Academic" | "Casual" | "Professional" | "Literature";
  text: string;
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct";

function hasNonLatinGarbage(s: string) {
  // Allow common punctuation + Azerbaijani Latin letters.
  // This flags Cyrillic/Greek/etc that sometimes leak in (like "им").
  return /[^\u0000-\u007F\u00A0-\u024F\u1E00-\u1EFF\u0300-\u036F\s.,!?;:'"()\-\u2013\u2014]/.test(s);
}

async function ollamaChat(messages: Array<{ role: "system" | "user"; content: string }>) {
  const resp = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) return { ok: false as const, status: resp.status, data };

  const out = (data?.message?.content ?? "").trim();
  return { ok: true as const, out, data };
}

function instructionFix() {
  return [
    "You are a STRICT Azerbaijani (az) grammar, spelling, and punctuation corrector.",
    "RULES:",
    "- Output MUST be Azerbaijani (az). Never Turkish/English/Russian.",
    "- Do NOT change meaning. Do NOT add new info.",
    "- Restore Azerbaijani diacritics when appropriate (ə, ı, ö, ü, ğ, ş, ç).",
    "- Output ONLY the corrected text. No explanations. No quotes. No markdown.",
  ].join("\n");
}

function instructionRewrite(vibe: string) {
  return [
    "You are a STRICT Azerbaijani (az) rewriting assistant.",
    `TASK: Rewrite the text in Azerbaijani in a ${vibe} vibe.`,
    "RULES:",
    "- Output MUST be Azerbaijani (az). Never Turkish/English/Russian.",
    "- Keep the same meaning. Do NOT add new info.",
    "- Output ONLY the rewritten text. No explanations. No quotes. No markdown.",
  ].join("\n");
}

function instructionCleanup() {
  return [
    "You are a STRICT Azerbaijani (az) text sanitizer.",
    "TASK: Clean the text so it contains ONLY Azerbaijani Latin letters and correct diacritics.",
    "RULES:",
    "- Remove/replace any non-Latin characters (e.g., Cyrillic) with correct Azerbaijani letters.",
    "- Fix missing diacritics (mən, sizə, yazıram, sənədlərimi, göndərmək, istəyirəm, çünki...).",
    "- Do NOT change meaning.",
    "- Output ONLY the cleaned text. No explanations.",
  ].join("\n");
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return ok({ ok: true });
    if (event.httpMethod !== "POST") return bad(405, "Method not allowed");

    const body = JSON.parse(event.body || "{}") as Partial<Body>;
    const text = (body.text || "").trim();
    const vibe = body.vibe || "Professional";
    const mode = body.mode || "fix";

    if (!text) return bad(400, "Text is required");

    const instr = mode === "fix" ? instructionFix() : instructionRewrite(vibe);

    // Pass 1: main transform
    const r1 = await ollamaChat([
      { role: "system", content: "Only Azerbaijani (az). Output only the final text." },
      { role: "user", content: `${instr}\n\nTEXT:\n${text}` },
    ]);
    if (!r1.ok) return bad(r1.status, "Ollama error", r1.data);

    let out = r1.out;
    if (!out) return bad(500, "Ollama returned no text", r1.data);

    // Pass 2: cleanup if we detect weird characters or obvious missing diacritics patterns
    if (hasNonLatinGarbage(out) || /göndərmek|isteyirəm|yaziram|men sizə/i.test(out)) {
      const r2 = await ollamaChat([
        { role: "system", content: "Only Azerbaijani (az). Output only the final text." },
        { role: "user", content: `${instructionCleanup()}\n\nTEXT:\n${out}` },
      ]);
      if (r2.ok && r2.out) out = r2.out;
    }

    return ok({ result: out });
  } catch (e: any) {
    return bad(500, "Internal Server Error", String(e?.message ?? e));
  }
};