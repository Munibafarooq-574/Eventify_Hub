export default function DisputesLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div
        role="status"
        className="mx-auto max-w-[1600px] animate-pulse space-y-6"
      >
        <div className="h-10 w-56 rounded-xl bg-slate-200" />
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-20 rounded-2xl bg-slate-200" />
        <div className="h-96 rounded-2xl bg-slate-200" />
        <span className="sr-only">Loading disputes...</span>
      </div>
    </main>
  );
}