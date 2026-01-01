import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { bad, ok } from "./_shared/http";

function getBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return ok({ ok: true });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return bad(500, "Missing server env vars: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    }

    const token = getBearerToken(event.headers.authorization || event.headers.Authorization);
    if (!token) return bad(401, "Missing Authorization Bearer token");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Verify who the user is using their JWT
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return bad(401, "Invalid session", userErr);

    const userId = userData.user.id;

    // Read profile row
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id,email,full_name,plan,plan_expires_at,stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    if (profErr) return bad(500, "Failed to load profile", profErr);

    // If profile doesn't exist yet, create it (safe upsert)
    if (!profile) {
      const email = userData.user.email ?? null;
      const { data: inserted, error: insErr } = await admin
        .from("profiles")
        .upsert({ id: userId, email, plan: "free" }, { onConflict: "id" })
        .select("id,email,full_name,plan,plan_expires_at,stripe_customer_id")
        .single();

      if (insErr) return bad(500, "Failed to create profile", insErr);
      return ok({ profile: inserted });
    }

    return ok(profile);
  } catch (e: any) {
    return bad(500, "Internal Server Error", String(e?.message ?? e));
  }
};