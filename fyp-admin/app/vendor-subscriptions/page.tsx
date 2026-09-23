import Link from "next/link";
import { redirect } from "next/navigation";

import AdminSidebar from "@/components/AdminSidebar";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

const PAGE_SIZE = 20;

type SubscriptionRow = {
  subscriptionId: string;
  vendorId: string;

  vendor: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    brandName?: string | null;
  };

  plan: string;
  storedStatus?: string;
  effectiveStatus: string;

  startDate?: string | null;
  endDate?: string | null;

  isTrial: boolean;

  trialStartDate?: string | null;
  trialEndDate?: string | null;
  trialDaysRemaining: number;

  paidStartDate?: string | null;
  paidEndDate?: string | null;
};

type ResponseData = {
  data: SubscriptionRow[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type PageProps = {
  searchParams: Promise<{
    search?: string | string[];
    plan?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
};

function first(
  value?: string | string[],
) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      dateStyle: "medium",
    },
  ).format(date);
}

function displayText(
  value?: string | null,
) {
  const text =
    String(value || "").trim();

  return text || "N/A";
}

function buildUrl(
  options: {
    search: string;
    plan: string;
    status: string;
    page: number;
  },
) {
  const query =
    new URLSearchParams();

  if (options.search) {
    query.set(
      "search",
      options.search,
    );
  }

  if (options.plan) {
    query.set(
      "plan",
      options.plan,
    );
  }

  if (options.status) {
    query.set(
      "status",
      options.status,
    );
  }

  if (options.page > 1) {
    query.set(
      "page",
      String(options.page),
    );
  }

  const suffix =
    query.toString();

  return suffix
    ? `/vendor-subscriptions?${suffix}`
    : "/vendor-subscriptions";
}

function statusClass(
  status: string,
) {
  switch (
    status.toLowerCase()
  ) {
    case "trial":
      return "bg-blue-50 text-blue-700";

    case "active":
      return "bg-emerald-50 text-emerald-700";

    case "expired":
      return "bg-amber-50 text-amber-700";

    case "cancelled":
      return "bg-rose-50 text-rose-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function VendorSubscriptionsPage({
  searchParams,
}: PageProps) {
  const token =
    await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const params =
    await searchParams;

  const search =
    String(
      first(params.search) || "",
    ).trim();

  const rawPlan =
    String(
      first(params.plan) || "",
    ).toLowerCase();

  const plan = [
    "basic",
    "growth",
    "premium",
  ].includes(rawPlan)
    ? rawPlan
    : "";

  const rawStatus =
    String(
      first(params.status) || "",
    ).toLowerCase();

  const status = [
    "trial",
    "active",
    "expired",
    "cancelled",
  ].includes(rawStatus)
    ? rawStatus
    : "";

  const rawPage =
    Number(
      first(params.page) || 1,
    );

  const page =
    Number.isSafeInteger(
      rawPage,
    ) &&
    rawPage > 0
      ? rawPage
      : 1;

  const backendQuery =
    new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });

  if (search) {
    backendQuery.set(
      "search",
      search,
    );
  }

  if (plan) {
    backendQuery.set(
      "plan",
      plan,
    );
  }

  if (status) {
    backendQuery.set(
      "status",
      status,
    );
  }

  let payload: ResponseData = {
    data: [],
    pagination: {
      page,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 0,
    },
  };

  let errorMessage = "";

  try {
    const response =
      await backendFetch(
        `/admin/vendor-subscriptions?${backendQuery.toString()}`,
        {
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      redirect("/login");
    }

    if (!response.ok) {
      const error =
        await response
          .json()
          .catch(() => null);

      errorMessage =
        typeof error?.message ===
        "string"
          ? error.message
          : "Unable to load vendor subscriptions.";
    } else {
      payload =
        (await response.json()) as ResponseData;
    }
  } catch {
    errorMessage =
      "Unable to connect to the backend.";
  }

  const total =
    Number(
      payload.pagination?.total ||
        0,
    );

  const totalPages =
    Number(
      payload.pagination
        ?.totalPages || 0,
    );

  const start =
    total === 0
      ? 0
      : (page - 1) *
          PAGE_SIZE +
        1;

  const end =
    total === 0
      ? 0
      : Math.min(
          page * PAGE_SIZE,
          total,
        );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="lg:flex">
        <AdminSidebar />

        <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                Subscription Management
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Vendor Subscriptions
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Current vendor subscription access and lifecycle.
                Payment verification remains separate under Subscription Payments.
              </p>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Matching Vendors
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {total.toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Current Plan
                </p>

                <p className="mt-2 text-lg font-bold capitalize">
                  {plan || "All Plans"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Current Status
                </p>

                <p className="mt-2 text-lg font-bold capitalize">
                  {status || "All Statuses"}
                </p>
              </div>
            </div>

            <form
              method="GET"
              className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-4"
            >
              <div>
                <label
                  htmlFor="search"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Search Vendor
                </label>

                <input
                  id="search"
                  name="search"
                  defaultValue={search}
                  placeholder="Name or email"
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-950"
                />
              </div>

              <div>
                <label
                  htmlFor="plan"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Plan
                </label>

                <select
                  id="plan"
                  name="plan"
                  defaultValue={plan}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                >
                  <option value="">
                    All Plans
                  </option>
                  <option value="basic">
                    Basic
                  </option>
                  <option value="growth">
                    Growth
                  </option>
                  <option value="premium">
                    Premium
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Status
                </label>

                <select
                  id="status"
                  name="status"
                  defaultValue={status}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                >
                  <option value="">
                    All Statuses
                  </option>
                  <option value="trial">
                    Trial
                  </option>
                  <option value="active">
                    Active
                  </option>
                  <option value="expired">
                    Expired
                  </option>
                  <option value="cancelled">
                    Cancelled
                  </option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Apply
                </button>

                <Link
                  href="/vendor-subscriptions"
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Reset
                </Link>
              </div>
            </form>

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
                {errorMessage}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold">
                      Vendor Subscription Records
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Showing {start}–{end} of {total}
                    </p>
                  </div>
                </div>

                {payload.data.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="font-semibold text-slate-700">
                      No vendor subscriptions found
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      No records match the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[1050px] w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-5 py-4">
                            Vendor
                          </th>
                          <th className="px-5 py-4">
                            Plan
                          </th>
                          <th className="px-5 py-4">
                            Status
                          </th>
                          <th className="px-5 py-4">
                            Trial
                          </th>
                          <th className="px-5 py-4">
                            Paid Period
                          </th>
                          <th className="px-5 py-4">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {payload.data.map(
                          (item) => (
                            <tr
                              key={
                                item.subscriptionId
                              }
                              className="align-top"
                            >
                              <td className="px-5 py-4">
                                <p className="font-semibold text-slate-900">
                                  {displayText(
                                    item.vendor
                                      ?.name,
                                  )}
                                </p>

                                {item.vendor
                                  ?.brandName ? (
                                  <p className="mt-1 text-xs text-slate-600">
                                    {
                                      item
                                        .vendor
                                        .brandName
                                    }
                                  </p>
                                ) : null}

                                <p className="mt-1 text-xs text-slate-500">
                                  {displayText(
                                    item.vendor
                                      ?.email,
                                  )}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <span className="font-semibold capitalize">
                                  {item.plan}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(
                                    item.effectiveStatus,
                                  )}`}
                                >
                                  {
                                    item.effectiveStatus
                                  }
                                </span>
                              </td>

                              <td className="px-5 py-4 text-xs text-slate-600">
                                {item.isTrial ? (
                                  <>
                                    <p>
                                      {formatDate(
                                        item.trialStartDate,
                                      )}
                                      {" → "}
                                      {formatDate(
                                        item.trialEndDate,
                                      )}
                                    </p>

                                    <p className="mt-1 font-semibold text-slate-800">
                                      {
                                        item.trialDaysRemaining
                                      }{" "}
                                      day(s) remaining
                                    </p>
                                  </>
                                ) : (
                                  "—"
                                )}
                              </td>

                              <td className="px-5 py-4 text-xs text-slate-600">
                                {item.paidStartDate ||
                                item.paidEndDate ? (
                                  <>
                                    {formatDate(
                                      item.paidStartDate,
                                    )}
                                    {" → "}
                                    {formatDate(
                                      item.paidEndDate,
                                    )}
                                  </>
                                ) : (
                                  "—"
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <Link
                                  href={`/vendor-subscriptions/${item.vendorId}`}
                                  className="font-semibold text-slate-950 underline underline-offset-4"
                                >
                                  View Details
                                </Link>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {totalPages > 1 ? (
                  <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                    <Link
                      aria-disabled={
                        page <= 1
                      }
                      href={
                        page > 1
                          ? buildUrl({
                              search,
                              plan,
                              status,
                              page:
                                page - 1,
                            })
                          : buildUrl({
                              search,
                              plan,
                              status,
                              page: 1,
                            })
                      }
                      className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                        page <= 1
                          ? "pointer-events-none border-slate-200 text-slate-300"
                          : "border-slate-300 text-slate-700"
                      }`}
                    >
                      Previous
                    </Link>

                    <span className="text-sm text-slate-500">
                      Page {page} of{" "}
                      {totalPages}
                    </span>

                    <Link
                      aria-disabled={
                        page >=
                        totalPages
                      }
                      href={
                        page <
                        totalPages
                          ? buildUrl({
                              search,
                              plan,
                              status,
                              page:
                                page + 1,
                            })
                          : buildUrl({
                              search,
                              plan,
                              status,
                              page,
                            })
                      }
                      className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                        page >=
                        totalPages
                          ? "pointer-events-none border-slate-200 text-slate-300"
                          : "border-slate-300 text-slate-700"
                      }`}
                    >
                      Next
                    </Link>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
