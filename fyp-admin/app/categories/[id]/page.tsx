import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CategoryEditForm from "@/components/CategoryEditForm";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type Category = {
  _id: string;
  name: string;
  normalizedName?: string;
  image?: string;
  description?: string;
  businessDetailsType?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value?: string) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function CategoryDetailPage({
  params,
}: PageProps) {
  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const { id } = await params;

  const response = await backendFetch(
    `/admin/categories/${id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    redirect("/login");
  }

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(
      "Unable to load category details.",
    );
  }

  const category: Category = await response.json();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-slate-200 bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b border-slate-200 px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Eventify Hub
              </p>

              <h1 className="mt-1 text-xl font-bold text-slate-900">
                Admin Panel
              </h1>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-5">
              <Link
                href="/dashboard"
                className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Dashboard
              </Link>

              <Link
                href="/bookings"
                className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Bookings
              </Link>

              <Link
                href="/vendors"
                className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Vendors
              </Link>

              <Link
                href="/clients"
                className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Clients
              </Link>

              <Link
                href="/categories"
                className="block rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
              >
                Categories
              </Link>
            </nav>

            <div className="border-t border-slate-200 px-6 py-5">
              <p className="text-xs text-slate-400">
                Category Management
              </p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6">
              <Link
                href="/categories"
                className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
              >
                ← Back to Categories
              </Link>
            </div>

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Category Management
                </p>

                <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  {category.name}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  View and update this service category.
                </p>
              </div>

              <span
                className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  category.isActive !== false
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-600"
                }`}
              >
                {category.isActive !== false
                  ? "Active"
                  : "Inactive"}
              </span>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Business Type
                </p>

                <p className="mt-2 text-sm font-bold text-slate-900">
                  {category.businessDetailsType ||
                    "GENERIC"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Normalized Name
                </p>

                <p className="mt-2 break-words text-sm font-bold text-slate-900">
                  {category.normalizedName || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Created
                </p>

                <p className="mt-2 text-sm font-bold text-slate-900">
                  {formatDate(category.createdAt)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Last Updated
                </p>

                <p className="mt-2 text-sm font-bold text-slate-900">
                  {formatDate(category.updatedAt)}
                </p>
              </div>
            </div>

            <CategoryEditForm category={category} />
          </div>
        </section>
      </div>
    </main>
  );
}