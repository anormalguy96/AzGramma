import type { Handler } from "@netlify/functions";
import { json } from "./_shared/http";
import { requireAuth } from "./_shared/auth";
import { supabaseAdmin } from "./_shared/supabaseAdmin";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { message: "Method not allowed" });

    const { userId, email } = await requireAuth(event);

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,plan,subscription_status,current_period_end")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("profiles")
        .insert({ id: userId, email })
        .select("id,email,full_name,plan,subscription_status,current_period_end")
        .single();
      if (insErr) throw insErr;
      return json(200, inserted);
    }

    return json(200, data);
  } catch (e) {
    return json(400, { message: e instanceof Error ? e.message : "Unknown error" });
  }
};
