import { Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type CheckoutResp = { url: string };

function Card({
  title,
  price,
  note,
  features,
  cta,
  variant,
  onClick,
  disabled,
}: {
  title: string;
  price: string;
  note: string;
  features: string[];
  cta: string;
  variant: "primary" | "outline";
  onClick: () => void;
  disabled?: boolean;
}) {
  const btnClass =
    variant === "primary"
      ? "rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
      : "rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50";

  return (
    <div className="rounded-3xl border p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="text-2xl font-bold">{price}</div>
      </div>
      <p className="mt-2 text-sm text-slate-500">{note}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check size={18} className="mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button className={`${btnClass} mt-6 w-full disabled:opacity-50`} onClick={onClick} disabled={disabled}>
        {cta}
      </button>
    </div>
  );
}

export function PricingPage() {
  const { session, user, profile, refreshProfile } = useAuth();

  async function subscribe(plan: "plus" | "pro") {
    if (!user || !session?.access_token) {
      alert("Please sign in first.");
      return;
    }

    const { url } = await apiFetch<CheckoutResp>("/api/create-checkout-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ plan }),
    });

    window.location.href = url;
  }

  async function openPortal() {
    if (!user || !session?.access_token) return;
    const { url } = await apiFetch<CheckoutResp>("/api/create-portal-session", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({}),
    });
    window.location.href = url;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border bg-slate-50 p-8">
        <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Free for everyday fixes. Plus and Pro for academics, professionals, and heavy usage.
        </p>
      </section>

      {profile && profile.plan !== "free" && (
        <div className="rounded-3xl border p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-slate-500">Current plan</div>
              <div className="text-lg font-semibold">{profile.plan.toUpperCase()}</div>
              <div className="text-sm text-slate-500">Status: {profile.subscription_status ?? "—"}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => void openPortal()}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Manage in Stripe
              </button>
              <button
                onClick={() => void refreshProfile()}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Free"
          price="$0"
          note="Light usage, basic corrections"
          features={["Grammar fixes", "Basic suggestions", "Limited monthly usage"]}
          cta={profile?.plan === "free" ? "Current plan" : "Included"}
          variant="outline"
          onClick={() => {}}
          disabled
        />
        <Card
          title="Plus"
          price="$6/mo"
          note="Vibe control + higher limits"
          features={["Everything in Free", "Choose vibe (Academic/Casual/Professional/Literature)", "3-day free trial"]}
          cta={profile?.plan === "plus" ? "Current plan" : "Start Plus"}
          variant="outline"
          onClick={() => void subscribe("plus")}
          disabled={profile?.plan === "plus"}
        />
        <Card
          title="Pro"
          price="$12/mo"
          note="All variants + maximum usage"
          features={["Everything in Plus", "Show all vibe variants at once", "3-day free trial", "Priority processing"]}
          cta={profile?.plan === "pro" ? "Current plan" : "Start Pro"}
          variant="primary"
          onClick={() => void subscribe("pro")}
          disabled={profile?.plan === "pro"}
        />
      </section>

      {!user && (
        <p className="text-sm text-slate-500">
          You can browse pricing without an account, but you’ll need to sign in to start a subscription.
        </p>
      )}
    </div>
  );
}
