export default function ReviewDetailLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <div className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:block" />

        <section className="min-w-0 flex-1">
          <div className="border-b border-slate-200 bg-white px-5 py-6 sm:px-8">
            <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
          </div>

          <div className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
            <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              <div className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            </div>

            <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />

            <div className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        </section>
      </div>
    </main>
  );
}
