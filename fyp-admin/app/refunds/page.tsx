import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/LogoutButton";
import RefundStatusActions from "@/components/RefundStatusActions";

import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type Person = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

type RefundBooking = {
  serviceName?: string | null;
  totalAmount?: number;
  status?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
};

type RefundStatus =
  | "PENDING"
  | "PROCESSING"
  | "REFUNDED"
  | "REJECTED";

type AdminRefundRow = {
  refundId: string;
  vendorOrderId: string;
  orderId: string;

  client?: Person | null;
  vendor?: Person | null;

  booking?: RefundBooking | null;

  amountPaid: number;
  refundAmount: number;
  withheldAmount: number;

  initiatedBy:
    | "ORGANIZER_CANCELLED"
    | "VENDOR_CANCELLED";

  daysBeforeEvent: number;

  cancellationPolicyApplied?: string | null;

  status: RefundStatus;

  processedAt?: string | null;
  refundedAt?: string | null;
  rejectedAt?: string | null;

  notes?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

type SearchParams = Promise<{
  status?: string | string[];
}>;

const money = (
  value?: number | null,
) =>
  `Rs ${Number(
    value || 0,
  ).toLocaleString("en-PK")}`;

const readable = (
  value?: string | null,
) => {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
};

const formatDateTime = (
  value?: string | null,
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
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

const refundStatusClass = (
  status?: string,
) => {
  switch (status) {
    case "REFUNDED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PROCESSING":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const params = await searchParams;

  const rawStatus = Array.isArray(
    params.status,
  )
    ? params.status[0]
    : params.status;

  const allowedStatuses = [
    "ALL",
    "PENDING",
    "PROCESSING",
    "REFUNDED",
    "REJECTED",
  ];

  const requestedStatus = String(
    rawStatus || "",
  ).toUpperCase();

  const selectedStatus =
    allowedStatuses.includes(
      requestedStatus,
    )
      ? requestedStatus
      : "ALL";

  const query =
    new URLSearchParams();

  query.set("limit", "100");
  query.set("skip", "0");

  if (selectedStatus !== "ALL") {
    query.set(
      "status",
      selectedStatus,
    );
  }

  const response = await backendFetch(
    `/admin/finance/refunds?${query.toString()}`,
    {
      method: "GET",
      cache: "no-store",
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

  if (!response.ok) {
    throw new Error(
      "Unable to load refunds.",
    );
  }

  const refunds =
    (await response.json()) as AdminRefundRow[];

  const totalRefundDue =
    refunds.reduce(
      (total, refund) =>
        total +
        Number(
          refund.refundAmount || 0,
        ),
      0,
    );

  const processingCount =
    refunds.filter(
      (refund) =>
        refund.status ===
        "PROCESSING",
    ).length;

  const refundedAmount =
    refunds
      .filter(
        (refund) =>
          refund.status ===
          "REFUNDED",
      )
      .reduce(
        (total, refund) =>
          total +
          Number(
            refund.refundAmount || 0,
          ),
        0,
      );

  const filters = [
    {
      label: "All",
      value: "ALL",
    },
    {
      label: "Pending",
      value: "PENDING",
    },
    {
      label: "Processing",
      value: "PROCESSING",
    },
    {
      label: "Refunded",
      value: "REFUNDED",
    },
    {
      label: "Rejected",
      value: "REJECTED",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Eventify Hub
            </p>

            <h1 className="mt-2 text-xl font-bold text-slate-900">
              Admin Console
            </h1>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            <Link
              href="/dashboard"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Dashboard
            </Link>

            <Link
              href="/bookings"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Bookings
            </Link>

            <Link
              href="/vendors"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Vendors
            </Link>

            <Link
              href="/clients"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Clients
            </Link>

            <Link
              href="/categories"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Categories
            </Link>

            <Link
              href="/payments"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Booking Payments
            </Link>

            <Link
              href="/refunds"
              className="block rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Refunds
            </Link>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <LogoutButton />
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Finance
                  </p>

                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    Refund Management
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Review and track
                    client-vendor refund
                    settlements. Eventify Hub
                    records settlement status
                    but does not treat booking
                    funds as platform revenue.
                  </p>
                </div>

                <Link
                  href="/dashboard"
                  className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] space-y-6 px-5 py-6 sm:px-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Loaded Refunds
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {refunds.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Refund Amount
                </p>

                <p className="mt-3 text-3xl font-bold text-amber-700">
                  {money(totalRefundDue)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Processing Cases
                </p>

                <p className="mt-3 text-3xl font-bold text-blue-700">
                  {processingCount}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Confirmed Refunded
                </p>

                <p className="mt-3 text-3xl font-bold text-emerald-700">
                  {money(refundedAmount)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map(
                (filter) => {
                  const active =
                    selectedStatus ===
                    filter.value;

                  return (
                    <Link
                      key={filter.value}
                      href={
                        filter.value ===
                        "ALL"
                          ? "/refunds"
                          : `/refunds?status=${filter.value}`
                      }
                      className={
                        active
                          ? "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                          : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                      }
                    >
                      {filter.label}
                    </Link>
                  );
                },
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {refunds.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <h3 className="text-lg font-bold text-slate-900">
                    No refunds found
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    No refund records match
                    this filter yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1900px] w-full border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Client
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Vendor
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Booking
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Booking Total
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Amount Paid
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Refund
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Withheld
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Initiated By
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Policy
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Cancellation
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Status
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Created
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {refunds.map(
                        (refund) => (
                          <tr
                            key={
                              refund.refundId
                            }
                            className="border-b border-slate-100 align-top last:border-b-0 hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {refund
                                  .client
                                  ?.name ??
                                  "Unknown Client"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {refund
                                  .client
                                  ?.email ??
                                  "—"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {refund
                                  .vendor
                                  ?.name ??
                                  "Unknown Vendor"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {refund
                                  .vendor
                                  ?.email ??
                                  "—"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {refund
                                  .booking
                                  ?.serviceName ??
                                  "N/A"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {readable(
                                  refund
                                    .booking
                                    ?.status,
                                )}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-700">
                              {money(
                                refund
                                  .booking
                                  ?.totalAmount,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-700">
                              {money(
                                refund.amountPaid,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-emerald-700">
                              {money(
                                refund.refundAmount,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-red-700">
                              {money(
                                refund.withheldAmount,
                              )}
                            </td>

                            <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                              {refund.initiatedBy ===
                              "ORGANIZER_CANCELLED"
                                ? "Client"
                                : "Vendor"}
                            </td>

                            <td className="max-w-[240px] px-5 py-4">
                              <p className="text-sm font-semibold text-slate-700">
                                {readable(
                                  refund.cancellationPolicyApplied,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  refund.daysBeforeEvent
                                }{" "}
                                day(s) before
                                event
                              </p>
                            </td>

                            <td className="max-w-[280px] px-5 py-4">
                              <p className="text-sm text-slate-700">
                                {refund
                                  .booking
                                  ?.cancellationReason ??
                                  "—"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatDateTime(
                                  refund
                                    .booking
                                    ?.cancelledAt,
                                )}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${refundStatusClass(
                                  refund.status,
                                )}`}
                              >
                                {readable(
                                  refund.status,
                                )}
                              </span>

                              {refund.status ===
                              "REFUNDED" ? (
                                <p className="mt-2 whitespace-nowrap text-xs text-slate-500">
                                  {formatDateTime(
                                    refund.refundedAt,
                                  )}
                                </p>
                              ) : null}

                              {refund.status ===
                              "REJECTED" ? (
                                <p className="mt-2 whitespace-nowrap text-xs text-slate-500">
                                  {formatDateTime(
                                    refund.rejectedAt,
                                  )}
                                </p>
                              ) : null}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                              {formatDateTime(
                                refund.createdAt,
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <RefundStatusActions
                                refundId={
                                  refund.refundId
                                }
                                currentStatus={
                                  refund.status
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

            <p className="text-xs text-slate-400">
              Refund records represent
              client-vendor settlement tracking.
              Mark Refunded only after the refund
              has actually been confirmed.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}