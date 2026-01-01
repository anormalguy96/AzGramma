import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { apiFetch } from "./api";

export type Plan = "free" | "plus" | "pro";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  plan: Plan;
  subscription_status: string | null;
  current_period_end: string | null;
};

type AuthValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthCtx = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProfile(accessToken?: string) {
    if (!accessToken) {
      setProfile(null);
      return;
    }
    type GetProfileResponse = { profile: Profile };

    const r = await apiFetch<GetProfileResponse>("/api/get-profile", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    setProfile(r.profile);

  }

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await loadProfile(data.session?.access_token);
      setIsLoading(false);

      const { data: listener } = supabase.auth.onAuthStateChange(
        async (_event, s) => {
          setSession(s);
          setUser(s?.user ?? null);
          await loadProfile(s?.access_token);
        }
      );
      unsub = () => listener.subscription.unsubscribe();
    })();

    return () => {
      unsub?.();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user,
      profile,
      isLoading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile: async () => {
        const { data } = await supabase.auth.getSession();
        await loadProfile(data.session?.access_token);
      },
    }),
    [session, user, profile, isLoading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
