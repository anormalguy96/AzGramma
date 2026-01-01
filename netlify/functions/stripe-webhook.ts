import type { Handler } from "@netlify/functions";
import Stripe from "stripe";

import { json } from "./_shared/http";
import { stripe } from "./_shared/stripe";
import { mustGetEnv } from "./_shared/env";
import { supabaseAdmin } from "./_shared/supabaseAdmin";

function bufFromEventBody(body: string, isBase64Encoded: boolean) {
  return isBase64Encoded ? Buffer.from(body, "base64") : Buffer.from(body, "utf8");
}

function planFromSubscription(sub: Stripe.Subscription): "free" | "plus" | "pro" {
  const plus = mustGetEnv("STRIPE_PRICE_PLUS");
  const pro = mustGetEnv("STRIPE_PRICE_PRO");
  const priceIds = sub.items.data.map((i) => i.price.id);
  if (priceIds.includes(pro)) return "pro";
  if (priceIds.includes(plus)) return "plus";
  return "free";
}

async function updateProfileFromSub(sub: Stripe.Subscription) {
  // customer can be string or object
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const plan = planFromSubscription(sub);
  const status = sub.status;
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

  // We stored supabase_user_id on the customer metadata OR subscription metadata.
  const supabaseUserId = (sub.metadata?.supabase_user_id ?? null) as string | null;

  if (supabaseUserId) {
    const { error } = await supabaseAdmin.from("profiles").upsert(
      {
        id: supabaseUserId,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        plan,
        subscription_status: status,
        current_period_end: periodEnd,
      },
      { onConflict: "id" }
    );
    if (error) throw error;
    return;
  }

  // Fallback: find profile by stripe_customer_id
  const { data: prof, error: findErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!prof?.id) return;

  const { error: upErr } = await supabaseAdmin
    .from("profiles")
    .update({
      stripe_subscription_id: sub.id,
      plan,
      subscription_status: status,
      current_period_end: periodEnd,
    })
    .eq("id", prof.id);
  if (upErr) throw upErr;
}

async function setFreeForCustomer(customerId: string) {
  const { data: prof, error: findErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!prof?.id) return;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ plan: "free", subscription_status: "canceled" })
    .eq("id", prof.id);
  if (error) throw error;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { message: "Method not allowed" });

    const secret = mustGetEnv("STRIPE_WEBHOOK_SECRET");
    const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
    if (!sig) return json(400, { message: "Missing Stripe-Signature header" });

    const payload = bufFromEventBody(event.body ?? "", event.isBase64Encoded ?? false);
    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = stripe.webhooks.constructEvent(payload, sig, secret);
    } catch (err) {
      return json(400, { message: `Webhook signature verification failed: ${err instanceof Error ? err.message : ""}` });
    }

    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const subId = session.subscription;
        if (typeof subId === "string") {
          const sub = await stripe.subscriptions.retrieve(subId);
          await updateProfileFromSub(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = stripeEvent.data.object as Stripe.Subscription;
        await updateProfileFromSub(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await setFreeForCustomer(customerId);
        break;
      }
      default:
        // Ignore other events
        break;
    }

    return json(200, { received: true });
  } catch (e) {
    return json(400, { message: e instanceof Error ? e.message : "Unknown error" });
  }
};
