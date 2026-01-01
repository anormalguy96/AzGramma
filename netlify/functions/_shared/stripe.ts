import Stripe from "stripe";
import { mustGetEnv } from "./env";

export const stripe = new Stripe(mustGetEnv("STRIPE_SECRET_KEY"));
