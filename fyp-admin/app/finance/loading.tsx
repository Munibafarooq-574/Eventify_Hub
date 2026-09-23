export default function FinanceLoading() {
  return (
    <main
      className="min-h-screen bg-slate-50 p-5 sm:p-8 lg:p-10"
      aria-busy="true"
      aria-label="Loading Finance Overview"
    >
      <div className="mx-auto max-w-[1600px] animate-pulse space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-8 w-56 rounded bg-slate-200" />
        </div>

        {/* Date filters */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="h-5 w-32 rounded bg-slate-200" />
          <div className="mt-4 flex flex-wrap gap-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-10 w-28 rounded-lg bg-slate-200"
              />
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="h-72 rounded-xl border border-slate-200 bg-white p-5">
          <div className="h-5 w-44 rounded bg-slate-200" />
          <div className="mt-6 h-48 rounded bg-slate-100" />
        </div>

        {/* Financial cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="mt-4 h-8 w-40 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-48 max-w-full rounded bg-slate-200" />
            </div>
          ))}
        </div>

        {/* Transactions table */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="h-6 w-52 rounded bg-slate-200" />
          <div className="mt-6 space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-12 rounded bg-slate-100"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}