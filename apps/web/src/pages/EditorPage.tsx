import { useMemo, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type Vibe = "Academic" | "Casual" | "Professional" | "Literature";

type Issue = {
  kind: string;
  message: string;
  original?: string | null;
  suggestion?: string | null;
};

type AiResponse = {
  correctedText: string;
  issues: Issue[];
  variants: Partial<Record<Vibe, string>>;
};

export function EditorPage() {
  const { session, user, profile } = useAuth();
  const [text, setText] = useState<string>(
    "Salam, mən sizə yazıram çünki sənədlərimi göndərmək isdəyirəm. Zəhmət olmasa mənə cavab yazın."
  );
  const [vibe, setVibe] = useState<Vibe>("Professional");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUseVibes = profile?.plan === "plus" || profile?.plan === "pro";
  const canSeeAllVariants = profile?.plan === "pro";

  const vibeOptions: Vibe[] = useMemo(
    () => ["Academic", "Casual", "Professional", "Literature"],
    []
  );

  async function run(task: "fix" | "rewrite") {
    setError(null);
    setResult(null);

    if (!user || !session?.access_token) {
      setError("Please sign in to use AzGramma.");
      return;
    }

    setIsLoading(true);
    try {
      const body = {
        text,
        task,
        vibe: canUseVibes ? vibe : "Professional",
        variants: canSeeAllVariants,
      };

      const data = await apiFetch<AiResponse>("/api/ai", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border bg-gradient-to-br from-slate-50 to-white p-8">
        <h1 className="text-3xl font-bold tracking-tight">Write Azerbaijani with confidence.</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Fix grammar, get lexical recommendations, and switch your sentence vibe (Academic, Casual, Professional,
          Literature) — tailored for Azerbaijan.
        </p>
        {profile?.plan === "free" && (
          <p className="mt-4 text-sm text-slate-500">
            You are on the Free plan. Upgrade for vibe control + more usage.
          </p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your text</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Vibe</label>
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={vibe}
                onChange={(e) => setVibe(e.target.value as Vibe)}
                disabled={!canUseVibes}
                title={!canUseVibes ? "Upgrade to Plus/Pro to unlock vibe controls" : ""}
              >
                {vibeOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            className="mt-4 h-64 w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 outline-none transition focus:border-slate-400"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => void run("fix")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles size={18} /> Fix grammar
            </button>
            <button
              onClick={() => void run("rewrite")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Wand2 size={18} /> Rewrite
            </button>
          </div>

          {error && <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        </div>

        <div className="rounded-3xl border p-6">
          <h2 className="text-lg font-semibold">Result</h2>

          {!result && (
            <p className="mt-4 text-sm text-slate-500">
              Click <span className="font-semibold">Fix grammar</span> or <span className="font-semibold">Rewrite</span>.
            </p>
          )}

          {result && (
            <div className="mt-4 space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Corrected text</h3>
                  <button
                    className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => void navigator.clipboard.writeText(result.correctedText)}
                  >
                    Copy
                  </button>
                </div>
                <div className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6">
                  {result.correctedText}
                </div>
              </div>

              {result.issues.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Suggestions</h3>
                  <ul className="mt-2 space-y-2">
                    {result.issues.map((it, idx) => (
                      <li key={idx} className="rounded-2xl border border-slate-200 p-4 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-semibold">{it.kind}</span>
                          {it.suggestion && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {it.suggestion}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-slate-600">{it.message}</p>
                        {it.original && (
                          <p className="mt-2 text-xs text-slate-500">
                            Original: <span className="font-mono">{it.original}</span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Object.keys(result.variants).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Vibe variants</h3>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {Object.entries(result.variants).map(([k, v]) => (
                      <div key={k} className="rounded-2xl border border-slate-200 p-4">
                        <div className="text-xs font-semibold text-slate-500">{k}</div>
                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6">{v}</div>
                      </div>
                    ))}
                  </div>
                  {!canSeeAllVariants && (
                    <p className="mt-2 text-xs text-slate-500">
                      Pro shows all variants at once. Plus lets you pick one vibe.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
