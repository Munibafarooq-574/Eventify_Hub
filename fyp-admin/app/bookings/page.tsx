import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/LogoutButton";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type AdminBookingRow = {
  bookingId: string;
  organizerName?: string;
  vendorName?: string;
  eventName?: string;
  eventDate?: string;
  eventTime?: string;
  amount?: number;
  downPayment?: number;
  remaining?: number;
  commission?: number;
  vendorNet?: number;
  bookingStatus?: string;
  paymentStatus?: string;
  payoutStatus?: string | null;
};

type PageProps = {
  searchParams: Promise<{
    filter?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 20;

/**
 * We request one extra row from backend.
 *
 * Example:
 * Page size = 20
 * Backend request limit = 21
 *
 * If 21 rows return:
 * there is another page.
 *
 * We still render only the first 20.
 *
 * This gives reliable Next/Previous pagination
 * without downloading the whole database
 * and without creating a duplicate count endpoint.
 */
const FETCH_LIMIT = PAGE_SIZE + 1;

const BOOKING_FILTERS = [
  "All",
  "Pending",
  "Accepted",
  "Confirmed",
  "Completed",
  "Cancelled",
  "Payment Pending",
  "Payout Pending",
  "Refunded",
] as const;

type BookingFilter = (typeof BOOKING_FILTERS)[number];

const money = (value?: number) =>
  `Rs ${Number(value || 0).toLocaleString("en-PK")}`;

const formatDate = (value?: string) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const statusClass = (status?: string) => {
  const value = status?.toLowerCase();

  if (value === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value === "accepted") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (value === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    value === "cancelled" ||
    value === "cancelled_by_vendor" ||
    value === "rejected" ||
    value === "expired"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
};

const paymentStatusClass = (status?: string) => {
  const value = status?.toUpperCase();

  if (value === "PAID" || value === "SUCCESS") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value === "PAYMENT_REQUIRED" ||
    value === "PENDING"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (value === "FAILED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
};

const normalizeFilter = (
  value?: string,
): BookingFilter => {
  if (
    value &&
    BOOKING_FILTERS.includes(value as BookingFilter)
  ) {
    return value as BookingFilter;
  }

  return "All";
};

const normalizePage = (value?: string) => {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    return 1;
  }

  return parsed;
};

const bookingsUrl = (
  filter: BookingFilter,
  page: number,
) => {
  const params = new URLSearchParams();

  if (filter !== "All") {
    params.set("filter", filter);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return `/bookings${query ? `?${query}` : ""}`;
};

export default async function BookingsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const activeFilter = normalizeFilter(
    params.filter,
  );

  const page = normalizePage(params.page);

  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const skip = (page - 1) * PAGE_SIZE;

  const backendParams =
    new URLSearchParams();

  if (activeFilter !== "All") {
    backendParams.set(
      "filter",
      activeFilter,
    );
  }

  backendParams.set(
    "limit",
    String(FETCH_LIMIT),
  );

  backendParams.set(
    "skip",
    String(skip),
  );

  const response = await backendFetch(
    `/admin/bookings?${backendParams.toString()}`,
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
      "Unable to load bookings.",
    );
  }

  const rawBookings =
    (await response.json()) as AdminBookingRow[];

  const hasNext =
    rawBookings.length > PAGE_SIZE;

  const bookings =
    rawBookings.slice(0, PAGE_SIZE);

  /**
   * If someone manually types:
   *
   * /bookings?page=999
   *
   * and no records exist there,
   * safely return them to page 1.
   */
  if (
    page > 1 &&
    bookings.length === 0
  ) {
    redirect(
      bookingsUrl(activeFilter, 1),
    );
  }

  const hasPrevious = page > 1;

  const firstVisible =
    bookings.length > 0
      ? skip + 1
      : 0;

  const lastVisible =
    bookings.length > 0
      ? skip + bookings.length
      : 0;

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
              className="block rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Bookings
            </Link>

            <div className="rounded-xl px-4 py-3 text-sm font-medium text-slate-400">
              Vendors
            </div>

            <div className="rounded-xl px-4 py-3 text-sm font-medium text-slate-400">
              Clients
            </div>

            <div className="rounded-xl px-4 py-3 text-sm font-medium text-slate-400">
              Categories
            </div>

            <div className="rounded-xl px-4 py-3 text-sm font-medium text-slate-400">
              Finance
            </div>

            <div className="rounded-xl px-4 py-3 text-sm font-medium text-slate-400">
              Disputes
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <LogoutButton />
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Booking Management
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                  Bookings
                </h2>
              </div>

              <div className="lg:hidden">
                <LogoutButton />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] px-5 py-6 md:px-8 md:py-8">
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Current filter"
                value={activeFilter}
              />

              <SummaryCard
                label="Current page"
                value={String(page)}
              />

              <SummaryCard
                label="Showing"
                value={
                  bookings.length
                    ? `${firstVisible}-${lastVisible}`
                    : "0"
                }
              />

              <SummaryCard
                label="More results"
                value={
                  hasNext ? "Yes" : "No"
                }
              />
            </div>

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Filter bookings
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Filter results using the existing backend booking filters.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {BOOKING_FILTERS.map(
                  (filter) => {
                    const isActive =
                      filter ===
                      activeFilter;

                    return (
                      <Link
                        key={filter}
                        href={bookingsUrl(
                          filter,
                          1,
                        )}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {filter}
                      </Link>
                    );
                  },
                )}
              </div>
            </section>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-bold">
                    {activeFilter === "All"
                      ? "All bookings"
                      : `${activeFilter} bookings`}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Page {page} · maximum{" "}
                    {PAGE_SIZE} records per
                    page.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {bookings.length} records
                  shown
                </span>
              </div>

              {bookings.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <p className="font-semibold text-slate-800">
                    No bookings found
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    No booking records match
                    the selected filter.
                  </p>

                  {activeFilter !==
                    "All" && (
                    <Link
                      href="/bookings"
                      className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      View all bookings
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1400px] text-left">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <TableHead>
                          Event
                        </TableHead>

                        <TableHead>
                          Client
                        </TableHead>

                        <TableHead>
                          Vendor
                        </TableHead>

                        <TableHead>
                          Date & Time
                        </TableHead>

                        <TableHead>
                          Amount
                        </TableHead>

                        <TableHead>
                          Remaining
                        </TableHead>

                        <TableHead>
                          Booking Status
                        </TableHead>

                        <TableHead>
                          Payment
                        </TableHead>

                        <TableHead>
                          Payout
                        </TableHead>

                        <TableHead>
                          Action
                        </TableHead>
                      </tr>
                    </thead>

                    <tbody>
                      {bookings.map(
                        (booking) => (
                          <tr
                            key={
                              booking.bookingId
                            }
                            className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/70"
                          >
                            <TableCell>
                              <div className="max-w-[220px]">
                                <p className="truncate font-semibold text-slate-900">
                                  {booking.eventName?.trim() ||
                                    "Unnamed event"}
                                </p>

                                <p className="mt-1 truncate text-xs text-slate-400">
                                  {
                                    booking.bookingId
                                  }
                                </p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="font-medium text-slate-800">
                                {booking.organizerName?.trim() ||
                                  "N/A"}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className="font-medium text-slate-800">
                                {booking.vendorName?.trim() ||
                                  "N/A"}
                              </span>
                            </TableCell>

                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-800">
                                  {formatDate(
                                    booking.eventDate,
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {booking.eventTime ||
                                    "Time not provided"}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {money(
                                    booking.amount,
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Down:{" "}
                                  {money(
                                    booking.downPayment,
                                  )}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {money(
                                    booking.remaining,
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Vendor net:{" "}
                                  {money(
                                    booking.vendorNet,
                                  )}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(
                                  booking.bookingStatus,
                                )}`}
                              >
                                {(
                                  booking.bookingStatus ||
                                  "unknown"
                                ).replaceAll(
                                  "_",
                                  " ",
                                )}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStatusClass(
                                  booking.paymentStatus,
                                )}`}
                              >
                                {(
                                  booking.paymentStatus ||
                                  "Not available"
                                ).replaceAll(
                                  "_",
                                  " ",
                                )}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className="text-sm font-medium text-slate-700">
                                {booking.payoutStatus ||
                                  "Not created"}
                              </span>
                            </TableCell>

                            <TableCell>
                              <Link
                                href={`/bookings/${booking.bookingId}`}
                                className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                              >
                                View details
                              </Link>
                            </TableCell>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Page {page}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {bookings.length > 0
                      ? `Showing records ${firstVisible}-${lastVisible}`
                      : "No records on this page"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {hasPrevious ? (
                    <Link
                      href={bookingsUrl(
                        activeFilter,
                        page - 1,
                      )}
                      className="inline-flex min-w-24 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                    >
                      ← Previous
                    </Link>
                  ) : (
                    <span className="inline-flex min-w-24 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
                      ← Previous
                    </span>
                  )}

                  <span className="inline-flex min-w-12 items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">
                    {page}
                  </span>

                  {hasNext ? (
                    <Link
                      href={bookingsUrl(
                        activeFilter,
                        page + 1,
                      )}
                      className="inline-flex min-w-24 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                    >
                      Next →
                    </Link>
                  ) : (
                    <span className="inline-flex min-w-24 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
                      Next →
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
      {children}
    </td>
  );
}