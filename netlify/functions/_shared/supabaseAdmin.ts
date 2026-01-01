import { createClient } from "@supabase/supabase-js";
import { mustGetEnv } from "./env";

const url = mustGetEnv("SUPABASE_URL");
const serviceKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
