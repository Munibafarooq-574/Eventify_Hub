import AdminSidebar from "@/components/AdminSidebar";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="lg:flex">
        <AdminSidebar />

        <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="h-24 animate-pulse rounded-2xl bg-white" />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
                  />
                ),
              )}
            </div>

            <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          </div>
        </section>
      </div>
    </main>
  );
}
