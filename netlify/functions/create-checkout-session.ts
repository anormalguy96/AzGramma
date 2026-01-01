import type { Handler } from "@netlify/functions";
import { z } from "zod";

import { json } from "./_shared/http";
import { requireAuth } from "./_shared/auth";
import { supabaseAdmin } from "./_shared/supabaseAdmin";
import { stripe } from "./_shared/stripe";
import { mustGetEnv } from "./_shared/env";

const Req = z.object({ plan: z.enum(["plus", "pro"]) });

function priceForPlan(plan: "plus" | "pro") {
  if (plan === "plus") return mustGetEnv("STRIPE_PRICE_PLUS");
  return mustGetEnv("STRIPE_PRICE_PRO");
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { message: "Method not allowed" });

    const { userId, email } = await requireAuth(event);
    const { plan } = Req.parse(JSON.parse(event.body ?? "{}"));

    const appUrl = mustGetEnv("APP_URL");

    // Ensure profile exists and has Stripe customer id
    const { data: prof, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw profErr;

    let customerId = prof?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      const { error: upErr } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, email, stripe_customer_id: customerId }, { onConflict: "id" });
      if (upErr) throw upErr;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceForPlan(plan), quantity: 1 }],
      subscription_data: {
        trial_period_days: 3,
        metadata: { supabase_user_id: userId, plan_requested: plan },
      },
      allow_promotion_codes: true,
      success_url: `${appUrl}/success`,
      cancel_url: `${appUrl}/cancel`,
      metadata: { supabase_user_id: userId, plan_requested: plan },
    });

    if (!session.url) throw new Error("Stripe session URL missing");

    return json(200, { url: session.url });
  } catch (e) {
    return json(400, { message: e instanceof Error ? e.message : "Unknown error" });
  }
};
