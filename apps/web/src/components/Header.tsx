import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import logoUrl from "@/assets/azgramma_logo.png";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-xl text-sm font-medium transition ${
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
  }`;

export function Header() {
  const { user, profile, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoUrl} alt="AzGramma" className="h-9 w-9" />
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-tight">AzGramma</div>
            <div className="text-xs text-slate-500">Azerbaijani writing assistant</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" className={navLinkClass} end>
            Editor
          </NavLink>
          <NavLink to="/pricing" className={navLinkClass}>
            Pricing
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
          {user && (
            <NavLink to="/account" className={navLinkClass}>
              Account
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {profile && (
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 md:inline">
              Plan: {profile.plan.toUpperCase()}
            </span>
          )}
          {!user ? (
            <Link
              to="/login"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Sign in
            </Link>
          ) : (
            <button
              onClick={() => void signOut()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
