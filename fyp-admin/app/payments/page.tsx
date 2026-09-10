import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/LogoutButton";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type Person = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

type BookingInfo = {
  serviceName?: string;
  bookingStatus?: string | null;
  totalAmount?: number;
  downPaymentType?: string | null;
  downPaymentPercentage?: number | null;
  downPaymentAmount?: number;
  configuredRemainingAmount?: number;
  paymentStatus?: string | null;
};

type AdminPaymentRow = {
  paymentId: string;
  vendorOrderId: string;
  orderId: string;

  client?: Person | null;
  vendor?: Person | null;

  booking?: BookingInfo | null;

  type: "DOWN_PAYMENT" | "REMAINING";
  amount: number;

  paidSoFar: number;
  outstandingAmount: number;

  status: "PENDING" | "SUCCESS" | "FAILED";

  method?: string | null;
  transactionRef?: string | null;
  paidAt?: string | null;
  failureReason?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

type SearchParams = Promise<{
  status?: string | string[];
}>;

const money = (value?: number | null) =>
  `Rs ${Number(value || 0).toLocaleString("en-PK")}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const transactionStatusClass = (status?: string) => {
  switch (status) {
    case "SUCCESS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const bookingPaymentStatusClass = (status?: string | null) => {
  switch (status) {
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PARTIALLY_PAID":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "PAYMENT_REQUIRED":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "PAYMENT_FAILED":
    case "PAYMENT_EXPIRED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const readable = (value?: string | null) => {
  if (!value) return "—";

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

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const params = await searchParams;

  const rawStatus = Array.isArray(params.status)
    ? params.status[0]
    : params.status;

  const allowedStatuses = [
    "ALL",
    "PENDING",
    "SUCCESS",
    "FAILED",
  ];

  const selectedStatus = allowedStatuses.includes(
    String(rawStatus || "").toUpperCase(),
  )
    ? String(rawStatus).toUpperCase()
    : "ALL";

  const query = new URLSearchParams();

  query.set("limit", "100");
  query.set("skip", "0");

  if (selectedStatus !== "ALL") {
    query.set("status", selectedStatus);
  }

  const response = await backendFetch(
  `/admin/finance/payments?${query.toString()}`,
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
      "Unable to load booking payments.",
    );
  }

  const payments =
    (await response.json()) as AdminPaymentRow[];

  const successfulAmount = payments
    .filter(
      (payment) =>
        payment.status === "SUCCESS",
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0,
    );

  const pendingAmount = payments
    .filter(
      (payment) =>
        payment.status === "PENDING",
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0,
    );

  const failedCount = payments.filter(
    (payment) =>
      payment.status === "FAILED",
  ).length;

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
      label: "Successful",
      value: "SUCCESS",
    },
    {
      label: "Failed",
      value: "FAILED",
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
              className="block rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Booking Payments
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
                    Booking Payments
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Track client-to-vendor down
                    payments and remaining
                    balances. Eventify Hub does
                    not charge booking commission.
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
                  Loaded Transactions
                </p>

                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {payments.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Successful Amount
                </p>

                <p className="mt-3 text-3xl font-bold text-emerald-700">
                  {money(successfulAmount)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Pending Amount
                </p>

                <p className="mt-3 text-3xl font-bold text-amber-700">
                  {money(pendingAmount)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Failed Transactions
                </p>

                <p className="mt-3 text-3xl font-bold text-red-700">
                  {failedCount}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const active =
                  selectedStatus ===
                  filter.value;

                return (
                  <Link
                    key={filter.value}
                    href={
                      filter.value === "ALL"
                        ? "/payments"
                        : `/payments?status=${filter.value}`
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
              })}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {payments.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <h3 className="text-lg font-bold text-slate-900">
                    No payments found
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    No booking payment
                    transactions match this
                    filter yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1500px] w-full border-collapse">
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

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Type
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Amount
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Total Booking
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Paid So Far
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          Remaining
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Method
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Transaction Ref
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Transaction
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Booking Payment
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Paid At
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {payments.map(
                        (payment) => (
                          <tr
                            key={
                              payment.paymentId
                            }
                            className="border-b border-slate-100 align-top last:border-b-0 hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {payment
                                  .client
                                  ?.name ??
                                  "Unknown Client"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {payment
                                  .client
                                  ?.email ??
                                  "—"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {payment
                                  .vendor
                                  ?.name ??
                                  "Unknown Vendor"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {payment
                                  .vendor
                                  ?.email ??
                                  "—"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {payment
                                  .booking
                                  ?.serviceName ??
                                  "N/A"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {readable(
                                  payment
                                    .booking
                                    ?.bookingStatus,
                                )}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span className="whitespace-nowrap text-sm font-semibold text-slate-700">
                                {readable(
                                  payment.type,
                                )}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-slate-900">
                              {money(
                                payment.amount,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-700">
                              {money(
                                payment.booking
                                  ?.totalAmount,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-emerald-700">
                              {money(
                                payment.paidSoFar,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-amber-700">
                              {money(
                                payment.outstandingAmount,
                              )}
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-700">
                              {readable(
                                payment.method,
                              )}
                            </td>

                            <td className="max-w-[220px] px-5 py-4">
                              <p className="break-all font-mono text-xs text-slate-600">
                                {payment.transactionRef ??
                                  "—"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${transactionStatusClass(
                                  payment.status,
                                )}`}
                              >
                                {readable(
                                  payment.status,
                                )}
                              </span>

                              {payment.failureReason ? (
                                <p className="mt-2 max-w-[220px] text-xs text-red-600">
                                  {
                                    payment.failureReason
                                  }
                                </p>
                              ) : null}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${bookingPaymentStatusClass(
                                  payment.booking
                                    ?.paymentStatus,
                                )}`}
                              >
                                {readable(
                                  payment.booking
                                    ?.paymentStatus,
                                )}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                              {formatDateTime(
                                payment.paidAt,
                              )}
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
              Booking payments are tracked
              separately from Eventify Hub vendor
              subscription revenue.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}