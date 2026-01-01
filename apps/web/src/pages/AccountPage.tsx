import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type Usage = {
  month: string;
  requests_count: number;
  limit: number;
};

export function AccountPage() {
  const { session, user, profile, refreshProfile, signOut } = useAuth();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadUsage() {
    if (!session?.access_token) return;
    const data = await apiFetch<Usage>("/api/get-usage", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({}),
    });
    setUsage(data);
  }

  async function openPortal() {
    if (!session?.access_token) return;
    const data = await apiFetch<{ url: string }>("/api/create-portal-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({}),
    });
    window.location.href = data.url;
  }

  useEffect(() => {
    void loadUsage();
  }, [session?.access_token]);

  async function refreshAll() {
    setError(null);
    setLoading(true);
    try {
      await refreshProfile();
      await loadUsage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border bg-slate-50 p-8">
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="mt-2 text-slate-600">Manage your plan, usage, and subscription.</p>
      </section>

      <section className="rounded-3xl border p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-500">Email</div>
            <div className="mt-1 font-semibold">{user?.email ?? "—"}</div>

            <div className="mt-4 text-xs font-semibold text-slate-500">Plan</div>
            <div className="mt-1 font-semibold">{profile?.plan?.toUpperCase() ?? "—"}</div>

            <div className="mt-4 text-xs font-semibold text-slate-500">Subscription</div>
            <div className="mt-1 text-sm text-slate-700">
              Status: {profile?.subscription_status ?? "—"}
              <br />
              Period end: {profile?.current_period_end ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500">Usage this month</div>
            <div className="mt-1 text-2xl font-bold">
              {usage ? `${usage.requests_count} / ${usage.limit}` : "—"}
            </div>
            {usage && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-slate-900"
                  style={{ width: `${Math.min(100, (usage.requests_count / usage.limit) * 100)}%` }}
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => void refreshAll()}
                disabled={loading}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                onClick={() => void openPortal()}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Manage in Stripe
              </button>
              <button
                onClick={() => void signOut()}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>

            {error && <p className="mt-4 text-sm text-rose-700">{error}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}