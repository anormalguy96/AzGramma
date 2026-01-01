import type { Handler } from "@netlify/functions";

import { json } from "./_shared/http";
import { requireAuth } from "./_shared/auth";
import { supabaseAdmin } from "./_shared/supabaseAdmin";
import { stripe } from "./_shared/stripe";
import { mustGetEnv } from "./_shared/env";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { message: "Method not allowed" });

    const { userId } = await requireAuth(event);
    const appUrl = mustGetEnv("APP_URL");

    const { data: prof, error } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;

    const customer = prof?.stripe_customer_id;
    if (!customer) {
      return json(400, { message: "No Stripe customer found for this user" });
    }

    const sess = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${appUrl}/account`,
    });

    return json(200, { url: sess.url });
  } catch (e) {
    return json(400, { message: e instanceof Error ? e.message : "Unknown error" });
  }
};
