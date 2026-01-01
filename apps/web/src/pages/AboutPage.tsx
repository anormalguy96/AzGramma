export function AboutPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border bg-slate-50 p-8">
        <h1 className="text-3xl font-bold tracking-tight">About AzGramma</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          AzGramma exists because Azerbaijani academic and formal writing often lacks a reliable, modern assistant.
          The goal is simple: help students, professors, PhDs, and everyday people write clearly, politely, and correctly—without turning the text into something unnatural.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border p-6">
          <h2 className="text-lg font-semibold">Grammar & orthography</h2>
          <p className="mt-2 text-sm text-slate-600">
            Corrections, punctuation help, and mistakes explained in plain language.
          </p>
        </div>
        <div className="rounded-3xl border p-6">
          <h2 className="text-lg font-semibold">Lexical recommendations</h2>
          <p className="mt-2 text-sm text-slate-600">
            Better word choices, avoiding repetition, and keeping tone consistent.
          </p>
        </div>
        <div className="rounded-3xl border p-6">
          <h2 className="text-lg font-semibold">Vibe switching</h2>
          <p className="mt-2 text-sm text-slate-600">
            Academic, Casual, Professional, Literature—so the same idea fits different contexts.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border p-6">
        <h2 className="text-lg font-semibold">Roadmap (MVP → Pro)</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>Plagiarism-safe rephrasing mode (meaning preserved)</li>
          <li>Document import (DOCX/PDF) and export</li>
          <li>Institution templates (university emails, official letters)</li>
          <li>Domain-specific vocab packs (law, medicine, engineering)</li>
          <li>Optional local model inference for privacy & speed</li>
        </ul>
      </section>
    </div>
  );
}
