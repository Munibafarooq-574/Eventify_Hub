export default function ReviewsLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <div className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:block" />

        <section className="min-w-0 flex-1">
          <div className="border-b border-slate-200 bg-white px-5 py-6 sm:px-8">
            <div className="h-7 w-36 animate-pulse rounded bg-slate-200" />
          </div>

          <div className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
            <div>
              <div className="h-9 w-64 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-200" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>

            <div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="h-16 animate-pulse border-b border-slate-200 bg-slate-50" />

              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse border-b border-slate-100"
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
