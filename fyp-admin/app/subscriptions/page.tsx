// fyp-admin/app/subscriptions/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/LogoutButton";
import SubscriptionPaymentActions from "@/components/SubscriptionPaymentActions";

import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type SubscriptionVendor = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
};

type VerifiedBy = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type SubscriptionPaymentRow = {
  subscriptionId: string;

  vendor: SubscriptionVendor | null;

  plan: string;

  subscriptionStatus: string;

  paymentStatus: string;

  paymentProvider: string;

  paymentReference?: string | null;

  amountDue: number;

  amountPaid: number;

  paymentSubmittedAt?: string | null;

  startDate?: string | null;

  endDate?: string | null;

  verifiedAt?: string | null;

  verifiedBy?: VerifiedBy | null;

  rejectionReason?: string | null;

  isCurrent: boolean;

  createdAt?: string | null;

  updatedAt?: string | null;
};

type SubscriptionPaymentsResponse = {
  total: number;
  limit: number;
  skip: number;
  items: SubscriptionPaymentRow[];
};

type SearchParams = {
  status?: string;
  plan?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

const money = (value?: number | null) =>
  `Rs ${Number(value || 0).toLocaleString("en-PK")}`;

const formatDateTime = (
  value?: string | null,
) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "N/A";
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
};

const formatDate = (
  value?: string | null,
) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "N/A";
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
};

const prettyText = (
  value?: string | null,
) => {
  if (!value) {
    return "N/A";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};

const paymentStatusClass = (
  status?: string,
) => {
  switch (
    String(status || "").toUpperCase()
  ) {
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const planClass = (
  plan?: string,
) => {
  switch (
    String(plan || "").toLowerCase()
  ) {
    case "premium":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "growth":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "basic":
      return "border-slate-200 bg-slate-100 text-slate-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
};

const sidebarItemClass = (
  active = false,
) =>
  `flex items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
    active
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export default async function SubscriptionsPage({
  searchParams,
}: PageProps) {
  const token =
    await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const params =
    searchParams
      ? await searchParams
      : {};

  const status =
    typeof params.status === "string"
      ? params.status.toUpperCase()
      : "ALL";

  const plan =
    typeof params.plan === "string"
      ? params.plan.toUpperCase()
      : "ALL";

  const query =
    new URLSearchParams();

  query.set("limit", "100");
  query.set("skip", "0");

  if (
    status !== "ALL"
  ) {
    query.set(
      "status",
      status,
    );
  }

  if (
    plan !== "ALL"
  ) {
    query.set(
      "plan",
      plan,
    );
  }

  const response =
    await backendFetch(
      `/admin/finance/subscription-payments?${query.toString()}`,
      {
        method: "GET",
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
    throw new Error(
      "Unable to load subscription payments.",
    );
  }

  const result =
    (await response.json()) as SubscriptionPaymentsResponse;

  const items =
    Array.isArray(result.items)
      ? result.items
      : [];

  const pendingCount =
    items.filter(
      (item) =>
        String(
          item.paymentStatus,
        ).toUpperCase() ===
        "PENDING",
    ).length;

  const paidCount =
    items.filter(
      (item) =>
        String(
          item.paymentStatus,
        ).toUpperCase() ===
        "PAID",
    ).length;

  const failedCount =
    items.filter(
      (item) =>
        String(
          item.paymentStatus,
        ).toUpperCase() ===
        "FAILED",
    ).length;

  const loadedRevenue =
    items
      .filter(
        (item) =>
          String(
            item.paymentStatus,
          ).toUpperCase() ===
          "PAID",
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.amountPaid ||
              0,
          ),
        0,
      );

  const statusFilters = [
    "ALL",
    "PENDING",
    "PAID",
    "FAILED",
  ];

  const planFilters = [
    "ALL",
    "BASIC",
    "GROWTH",
    "PREMIUM",
  ];

  const filterHref = (
    nextStatus: string,
    nextPlan: string,
  ) => {
    const filterQuery =
      new URLSearchParams();

    if (
      nextStatus !==
      "ALL"
    ) {
      filterQuery.set(
        "status",
        nextStatus,
      );
    }

    if (
      nextPlan !==
      "ALL"
    ) {
      filterQuery.set(
        "plan",
        nextPlan,
      );
    }

    const text =
      filterQuery.toString();

    return text
      ? `/subscriptions?${text}`
      : "/subscriptions";
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">

        {/* ================= SIDEBAR ================= */}

        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Eventify Hub
            </p>

            <h1 className="mt-2 text-xl font-bold text-slate-900">
              Admin Console
            </h1>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-5">
            <Link
              href="/dashboard"
              className={sidebarItemClass()}
            >
              Dashboard
            </Link>

            <Link
              href="/bookings"
              className={sidebarItemClass()}
            >
              Bookings
            </Link>

            <Link
              href="/vendors"
              className={sidebarItemClass()}
            >
              Vendors
            </Link>

            <Link
              href="/clients"
              className={sidebarItemClass()}
            >
              Clients
            </Link>

            <Link
              href="/categories"
              className={sidebarItemClass()}
            >
              Categories
            </Link>

            <div className="px-4 pb-1 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Finance
              </p>
            </div>

            <Link
              href="/payments"
              className={sidebarItemClass()}
            >
              Booking Payments
            </Link>

            <Link
              href="/refunds"
              className={sidebarItemClass()}
            >
              Refunds
            </Link>

            <Link
              href="/subscriptions"
              className={sidebarItemClass(
                true,
              )}
            >
              Subscription Payments
            </Link>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <LogoutButton />
          </div>
        </aside>

        {/* ================= CONTENT ================= */}

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8 lg:px-10">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Finance
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Subscription Payments
                </h2>
              </div>

              <div className="lg:hidden">
                <LogoutButton />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] space-y-6 px-5 py-7 sm:px-8 lg:px-10">

            {/* ================= INTRO ================= */}

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Vendor Subscription Finance
              </h3>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Review vendor subscription payment
                references and confirm actual
                Eventify Hub subscription revenue.
                Booking payments are tracked
                separately.
              </p>
            </div>

            {/* ================= KPIs ================= */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Loaded Requests
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {items.length}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Total database records:{" "}
                  {Number(
                    result.total ||
                      0,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Pending Verification
                </p>

                <p className="mt-2 text-3xl font-bold text-amber-700">
                  {pendingCount}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Admin action required
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Verified Paid
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-700">
                  {paidCount}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  {money(
                    loadedRevenue,
                  )}{" "}
                  loaded revenue
                </p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Failed / Rejected
                </p>

                <p className="mt-2 text-3xl font-bold text-red-700">
                  {failedCount}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Payment could not be verified
                </p>
              </div>
            </div>

            {/* ================= FILTERS ================= */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Payment Status
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {statusFilters.map(
                      (
                        filter,
                      ) => (
                        <Link
                          key={
                            filter
                          }
                          href={filterHref(
                            filter,
                            plan,
                          )}
                          className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                            status ===
                            filter
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {
                            filter
                          }
                        </Link>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Subscription Plan
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {planFilters.map(
                      (
                        filter,
                      ) => (
                        <Link
                          key={
                            filter
                          }
                          href={filterHref(
                            status,
                            filter,
                          )}
                          className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                            plan ===
                            filter
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {
                            filter
                          }
                        </Link>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ================= TABLE ================= */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-bold text-slate-900">
                  Subscription Payment Records
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Showing{" "}
                  {
                    items.length
                  }{" "}
                  record(s)
                </p>
              </div>

              {items.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                    ₨
                  </div>

                  <h4 className="mt-4 font-semibold text-slate-900">
                    No subscription payments found
                  </h4>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Vendor subscription payment
                    requests matching the selected
                    filters will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1550px] w-full text-left">
                    <thead className="bg-slate-50">
                      <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-3">
                          Vendor
                        </th>

                        <th className="px-5 py-3">
                          Plan
                        </th>

                        <th className="px-5 py-3">
                          Amount
                        </th>

                        <th className="px-5 py-3">
                          Method
                        </th>

                        <th className="px-5 py-3">
                          Reference
                        </th>

                        <th className="px-5 py-3">
                          Status
                        </th>

                        <th className="px-5 py-3">
                          Submitted
                        </th>

                        <th className="px-5 py-3">
                          Subscription Period
                        </th>

                        <th className="px-5 py-3">
                          Verification
                        </th>

                        <th className="px-5 py-3">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {items.map(
                        (
                          item,
                        ) => (
                          <tr
                            key={
                              item.subscriptionId
                            }
                            className="align-top transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <div className="max-w-[230px]">
                                <p className="font-semibold text-slate-900">
                                  {item
                                    .vendor
                                    ?.brandName ||
                                    item
                                      .vendor
                                      ?.name ||
                                    "Unknown Vendor"}
                                </p>

                                {item
                                  .vendor
                                  ?.brandName &&
                                item
                                  .vendor
                                  ?.name ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {
                                      item
                                        .vendor
                                        .name
                                    }
                                  </p>
                                ) : null}

                                <p className="mt-1 break-all text-xs text-slate-500">
                                  {item
                                    .vendor
                                    ?.email ||
                                    "No email"}
                                </p>

                                {item
                                  .vendor
                                  ?.categoryName ? (
                                  <p className="mt-1 text-xs text-slate-400">
                                    {
                                      item
                                        .vendor
                                        .categoryName
                                    }
                                  </p>
                                ) : null}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${planClass(
                                  item.plan,
                                )}`}
                              >
                                {prettyText(
                                  item.plan,
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {money(
                                  item.amountDue,
                                )}
                              </p>

                              {String(
                                item.paymentStatus,
                              ).toUpperCase() ===
                              "PAID" ? (
                                <p className="mt-1 text-xs text-emerald-700">
                                  Paid:{" "}
                                  {money(
                                    item.amountPaid,
                                  )}
                                </p>
                              ) : null}
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-700">
                              {prettyText(
                                item.paymentProvider,
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <code className="break-all rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                {item.paymentReference ||
                                  "N/A"}
                              </code>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${paymentStatusClass(
                                  item.paymentStatus,
                                )}`}
                              >
                                {prettyText(
                                  item.paymentStatus,
                                )}
                              </span>

                              <p className="mt-2 text-xs text-slate-400">
                                Subscription:{" "}
                                {prettyText(
                                  item.subscriptionStatus,
                                )}
                              </p>

                              {item.rejectionReason ? (
                                <p className="mt-2 max-w-[220px] text-xs leading-5 text-red-600">
                                  {
                                    item.rejectionReason
                                  }
                                </p>
                              ) : null}
                            </td>

                            <td className="px-5 py-4 text-xs leading-5 text-slate-600">
                              {formatDateTime(
                                item.paymentSubmittedAt ||
                                  item.createdAt,
                              )}
                            </td>

                            <td className="px-5 py-4 text-xs leading-5 text-slate-600">
                              <div>
                                <span className="font-medium text-slate-700">
                                  Start:
                                </span>{" "}
                                {formatDate(
                                  item.startDate,
                                )}
                              </div>

                              <div className="mt-1">
                                <span className="font-medium text-slate-700">
                                  End:
                                </span>{" "}
                                {formatDate(
                                  item.endDate,
                                )}
                              </div>

                              {item.isCurrent ? (
                                <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                  Current
                                </span>
                              ) : null}
                            </td>

                            <td className="px-5 py-4 text-xs leading-5 text-slate-600">
                              {item.verifiedAt ? (
                                <>
                                  <p>
                                    {formatDateTime(
                                      item.verifiedAt,
                                    )}
                                  </p>

                                  {item.verifiedBy ? (
                                    <p className="mt-1 text-slate-400">
                                      By{" "}
                                      {item
                                        .verifiedBy
                                        .name ||
                                        item
                                          .verifiedBy
                                          .email ||
                                        "Admin"}
                                    </p>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-slate-400">
                                  Not reviewed
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <SubscriptionPaymentActions
                                subscriptionId={
                                  item.subscriptionId
                                }
                                paymentStatus={
                                  item.paymentStatus
                                }
                              />
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
              Subscription revenue is recorded only
              after Admin verifies a vendor payment
              as PAID. Booking payments remain a
              separate Client-to-Vendor financial
              workflow.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
