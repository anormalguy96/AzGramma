import { Link } from "react-router-dom";

export function CancelPage() {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border p-6">
      <h1 className="text-2xl font-bold">Checkout canceled</h1>
      <p className="mt-2 text-sm text-slate-600">
        No worries. You can restart any time from the Pricing page.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/pricing"
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Back to Pricing
        </Link>
        <Link
          to="/"
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Editor
        </Link>
      </div>
    </div>
  );
}
