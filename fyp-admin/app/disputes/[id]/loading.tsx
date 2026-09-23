export default function DisputeDetailsLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div
        role="status"
        className="mx-auto max-w-[1500px] animate-pulse space-y-6"
      >
        <div className="h-10 w-64 rounded-xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
        </div>
        <div className="h-72 rounded-2xl bg-slate-200" />
        <div className="h-72 rounded-2xl bg-slate-200" />
        <span className="sr-only">
          Loading dispute details...
        </span>
      </div>
    </main>
  );
}