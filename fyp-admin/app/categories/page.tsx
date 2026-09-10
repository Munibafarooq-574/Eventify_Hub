import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type SearchParams = Promise<{
  search?: string;
  status?: string;
  page?: string;
  requestStatus?: string;
}>;

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

type CategoryRequest = {
  _id: string;
  requestedName: string;
  normalizedName?: string;
  description?: string;
  status: string;
  requestedBy?: {
    _id?: string;
    name?: string;
    email?: string;
  } | null;
  reviewedBy?: {
    _id?: string;
    name?: string;
    email?: string;
  } | null;
  reviewedAt?: string | null;
  approvedCategoryId?:
    | string
    | {
        _id?: string;
        name?: string;
      }
    | null;
  adminNote?: string | null;
  createdAt?: string;
};

type CategoriesResponse = {
  categories?: Category[];
  total?: number;
  limit?: number;
  skip?: number;
};

function getQueryValue(value: string | undefined) {
  return value?.trim() || "";
}

function getPageNumber(value: string | undefined) {
  const parsed = Number(value || "1");

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function buildCategoriesHref({
  search,
  status,
  requestStatus,
  page,
}: {
  search: string;
  status: string;
  requestStatus: string;
  page: number;
}) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  if (status && status !== "ALL") {
    params.set("status", status);
  }

  if (requestStatus && requestStatus !== "ALL") {
    params.set("requestStatus", requestStatus);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/categories?${query}` : "/categories";
}

function getStatusClasses(isActive?: boolean) {
  if (isActive) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  return "bg-slate-100 text-slate-600 border-slate-200";
}

function getRequestStatusClasses(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";

    case "MERGED":
      return "bg-blue-50 text-blue-700 border-blue-200";

    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const params = await searchParams;

  const search = getQueryValue(params.search);
  const status = getQueryValue(params.status).toUpperCase() || "ALL";
  const requestStatus =
    getQueryValue(params.requestStatus).toUpperCase() || "ALL";

  const page = getPageNumber(params.page);

  const limit = 10;
  const skip = (page - 1) * limit;

  const categoryQuery = new URLSearchParams();

  if (search) {
    categoryQuery.set("search", search);
  }

  if (status !== "ALL") {
    categoryQuery.set("status", status);
  }

  categoryQuery.set("limit", String(limit));
  categoryQuery.set("skip", String(skip));

  const requestQuery = new URLSearchParams();

  if (requestStatus !== "ALL") {
    requestQuery.set("status", requestStatus);
  }

const [categoryResponse, requestResponse] = await Promise.all([
  backendFetch(
    `/admin/categories?${categoryQuery.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  ),
  backendFetch(
    `/admin/category-requests${
      requestQuery.toString()
        ? `?${requestQuery.toString()}`
        : ""
    }`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  ),
]);

  if (
    categoryResponse.status === 401 ||
    categoryResponse.status === 403 ||
    requestResponse.status === 401 ||
    requestResponse.status === 403
  ) {
    redirect("/login");
  }

  let categoryData: CategoriesResponse = {};
  let categoryRequests: CategoryRequest[] = [];

  if (categoryResponse.ok) {
    categoryData = await categoryResponse.json();
  }

  if (requestResponse.ok) {
    const requestData = await requestResponse.json();

    if (Array.isArray(requestData)) {
      categoryRequests = requestData;
    } else if (Array.isArray(requestData?.requests)) {
      categoryRequests = requestData.requests;
    }
  }

  const categories = Array.isArray(categoryData.categories)
    ? categoryData.categories
    : Array.isArray(categoryData)
      ? categoryData
      : [];

  const total = Number(categoryData.total || categories.length);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const activeCount = categories.filter(
    (category) => category.isActive,
  ).length;

  const inactiveCount = categories.filter(
    (category) => !category.isActive,
  ).length;

  const pendingRequests = categoryRequests.filter(
    (request) => request.status === "PENDING",
  ).length;

  const previousHref = buildCategoriesHref({
    search,
    status,
    requestStatus,
    page: Math.max(1, page - 1),
  });

  const nextHref = buildCategoriesHref({
    search,
    status,
    requestStatus,
    page: Math.min(totalPages, page + 1),
  });

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
          <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Core Management
                </p>

                <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  Categories
                </h2>

                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Manage service categories and review vendor
                  category requests.
                </p>
              </div>

              <Link
                href="/categories/new"
                className="inline-flex w-fit items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Add Category
              </Link>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Active on this page
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {activeCount}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Inactive on this page
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {inactiveCount}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Pending Requests
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {pendingRequests}
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <form
                action="/categories"
                method="GET"
                className="grid gap-4 lg:grid-cols-[1fr_200px_200px_auto]"
              >
                <div>
                  <label
                    htmlFor="search"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Search
                  </label>

                  <input
                    id="search"
                    name="search"
                    defaultValue={search}
                    placeholder="Search category..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="status"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Category Status
                  </label>

                  <select
                    id="status"
                    name="status"
                    defaultValue={status}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                  >
                    <option value="ALL">All</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">
                      Inactive
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="requestStatus"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Request Status
                  </label>

                  <select
                    id="requestStatus"
                    name="requestStatus"
                    defaultValue={requestStatus}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                  >
                    <option value="ALL">All</option>
                    <option value="PENDING">
                      Pending
                    </option>
                    <option value="APPROVED">
                      Approved
                    </option>
                    <option value="REJECTED">
                      Rejected
                    </option>
                    <option value="MERGED">Merged</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Apply
                  </button>

                  <Link
                    href="/categories"
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Reset
                  </Link>
                </div>
              </form>
            </div>

            <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Service Categories
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {total} categor{total === 1 ? "y" : "ies"} found
                  </p>
                </div>
              </div>

              {categories.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-base font-semibold text-slate-700">
                    No categories found
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Try changing your search or filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Category
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Business Type
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Updated
                        </th>

                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {categories.map((category) => (
                        <tr
                          key={category._id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                {category.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={category.image}
                                    alt={category.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                                    IMG
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {category.name}
                                </p>

                                <p className="mt-1 max-w-md truncate text-sm text-slate-500">
                                  {category.description ||
                                    "No description"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm font-medium text-slate-600">
                            {category.businessDetailsType ||
                              "GENERIC"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                                category.isActive,
                              )}`}
                            >
                              {category.isActive
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-500">
                            {formatDate(
                              category.updatedAt ||
                                category.createdAt,
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/categories/${category._id}`}
                              className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </p>

                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link
                      href={previousHref}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-300">
                      Previous
                    </span>
                  )}

                  {page < totalPages ? (
                    <Link
                      href={nextHref}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-300">
                      Next
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-bold text-slate-900">
                  Category Requests
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Review category suggestions submitted through the
                  platform.
                </p>
              </div>

              {categoryRequests.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <p className="font-semibold text-slate-700">
                    No category requests found
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {categoryRequests.map((request) => (
                    <div
                      key={request._id}
                      className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {request.requestedName}
                          </p>

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRequestStatusClasses(
                              request.status,
                            )}`}
                          >
                            {request.status}
                          </span>
                        </div>

                        <p className="mt-2 max-w-3xl text-sm text-slate-500">
                          {request.description ||
                            "No description provided."}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                          <span>
                            Submitted:{" "}
                            {formatDate(request.createdAt)}
                          </span>

                          {request.reviewedAt ? (
                            <span>
                              Reviewed:{" "}
                              {formatDate(request.reviewedAt)}
                            </span>
                          ) : null}

                          {request.adminNote ? (
                            <span>
                              Note: {request.adminNote}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <Link
                        href={`/categories/requests/${request._id}`}
                        className="inline-flex w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        {request.status === "PENDING"
                          ? "Review"
                          : "View"}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}