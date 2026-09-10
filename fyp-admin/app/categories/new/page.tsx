import Link from "next/link";
import { redirect } from "next/navigation";
import CategoryCreateForm from "@/components/CategoryCreateForm";
import { getAdminToken } from "@/lib/auth";

export default async function NewCategoryPage() {
  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/categories"
            className="mb-4 inline-flex items-center text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            ← Back to Categories
          </Link>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Category Management
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Add Category
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Create a new service category that vendors
              can use when registering and configuring
              their services.
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <CategoryCreateForm />
        </section>
      </div>
    </main>
  );
}