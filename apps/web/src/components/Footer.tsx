export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} AzGramma</span>
          <span className="text-xs">
            Built for Azerbaijani academic & professional writing.
          </span>
        </div>
      </div>
    </footer>
  );
}
