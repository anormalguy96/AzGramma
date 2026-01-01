import type { HandlerEvent } from "@netlify/functions";
import { supabaseAdmin } from "./supabaseAdmin";

export type Authed = {
  userId: string;
  email: string | null;
  accessToken: string;
};

export async function requireAuth(event: HandlerEvent): Promise<Authed> {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Authorization header");
  }
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw new Error("Invalid token");
  }
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    accessToken: token,
  };
}
