import type { Handler } from "@netlify/functions";
import { json } from "./_shared/http";
import { requireAuth } from "./_shared/auth";
import { supabaseAdmin } from "./_shared/supabaseAdmin";
import { getMonthlyLimit, type Plan } from "./_shared/plans";

function currentMonthKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { message: "Method not allowed" });

    const { userId } = await requireAuth(event);

    const { data: prof, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw profErr;
    const plan = (prof?.plan ?? "free") as Plan;
    const limit = getMonthlyLimit(plan);

    const month = currentMonthKey();
    const { data, error } = await supabaseAdmin
      .from("usage_monthly")
      .select("month,requests_count")
      .eq("user_id", userId)
      .eq("month", month)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("usage_monthly")
        .insert({ user_id: userId, month, requests_count: 0 })
        .select("month,requests_count")
        .single();
      if (insErr) throw insErr;
      return json(200, { ...inserted, limit });
    }

    return json(200, { ...data, limit });
  } catch (e) {
    return json(400, { message: e instanceof Error ? e.message : "Unknown error" });
  }
};
