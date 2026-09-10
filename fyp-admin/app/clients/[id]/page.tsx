import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type ClientBooking = {
  bookingId: string;
  vendorId: string | null;
  vendorName: string;
  serviceName: string;
  amount: number;
  downPayment: number;
  remaining: number;
  bookingStatus: string;
  paymentStatus: string | null;
  createdAt: string | null;
};

type ClientEvent = {
  orderId: string;
  eventName: string;
  eventType: string;
  guests: number;
  eventDate: string | null;
  eventTime: string;
  eventStartDateTime: string | null;
  eventEndDateTime: string | null;
  eventDurationMinutes: number;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  status: string;
  vendorBookingCount: number;
  bookings: ClientBooking[];
  createdAt: string | null;
  updatedAt: string | null;
};

type ClientDetail = {
  clientId: string;
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  isOnline: boolean;
  lastSeen: string | null;
  totalEvents: number;
  totalVendorBookings: number;
  totalSpent: number;
  pendingEvents: number;
  confirmedEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  events: ClientEvent[];
  createdAt: string | null;
  updatedAt: string | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function formatDateTime(
  value?: string | null,
) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Not available";
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
}

function formatCurrency(
  value?: number,
) {
  return new Intl.NumberFormat(
    "en-PK",
    {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    },
  ).format(
    Number(value || 0),
  );
}

function statusClass(
  status?: string | null,
) {
  const value =
    status?.toLowerCase() ||
    "";

  if (
    value === "completed" ||
    value === "paid" ||
    value === "success"
  ) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    value === "pending" ||
    value ===
      "payment_required"
  ) {
    return "bg-amber-100 text-amber-700";
  }

  if (
    value === "cancelled" ||
    value ===
      "cancelled_by_vendor" ||
    value === "rejected"
  ) {
    return "bg-rose-100 text-rose-700";
  }

  if (
    value === "accepted" ||
    value === "confirmed"
  ) {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-600";
}

function prettyStatus(
  value?: string | null,
) {
  if (!value) {
    return "Not available";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

export default async function ClientDetailPage({
  params,
}: PageProps) {
  const { id } =
    await params;

  const token =
    await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const response =
    await backendFetch(
      `/admin/clients/${encodeURIComponent(
        id,
      )}`,
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

  if (
    response.status === 404
  ) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(
      "Unable to load client details.",
    );
  }

  const client =
    (await response.json()) as ClientDetail | null;

  if (!client) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/clients"
              className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
            >
              ← Back to Clients
            </Link>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              Client Details
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Account, event and vendor
              booking activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                client.isOnline
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {client.isOnline
                ? "Online"
                : "Offline"}
            </span>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Client
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                {client.name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {client.email}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Client ID
              </p>

              <p className="mt-1 break-all font-mono text-xs text-slate-700">
                {client.clientId}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Events
            </p>

            <p className="mt-2 text-3xl font-bold">
              {client.totalEvents}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Vendor Bookings
            </p>

            <p className="mt-2 text-3xl font-bold">
              {
                client.totalVendorBookings
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Booking Value
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(
                client.totalSpent,
              )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Event/order value, not
              confirmed payment revenue
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Completed Events
            </p>

            <p className="mt-2 text-3xl font-bold">
              {
                client.completedEvents
              }
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold">
              Account Information
            </h3>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Name
                </dt>

                <dd className="mt-1 text-sm font-medium">
                  {client.name}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Email
                </dt>

                <dd className="mt-1 text-sm font-medium">
                  {client.email}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Phone
                </dt>

                <dd className="mt-1 text-sm font-medium">
                  {
                    client.phoneNumber
                  }
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Address
                </dt>

                <dd className="mt-1 text-sm font-medium">
                  {client.address}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold">
              Activity
            </h3>

            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Pending Events
                </dt>

                <dd className="mt-1 text-xl font-bold">
                  {
                    client.pendingEvents
                  }
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Confirmed Events
                </dt>

                <dd className="mt-1 text-xl font-bold">
                  {
                    client.confirmedEvents
                  }
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Cancelled Events
                </dt>

                <dd className="mt-1 text-xl font-bold">
                  {
                    client.cancelledEvents
                  }
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Last Seen
                </dt>

                <dd className="mt-1 text-sm font-medium">
                  {formatDateTime(
                    client.lastSeen,
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Joined
                </dt>

                <dd className="mt-1 text-sm font-medium">
                  {formatDate(
                    client.createdAt,
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Updated
                </dt>

                <dd className="mt-1 text-sm font-medium">
                  {formatDateTime(
                    client.updatedAt,
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h3 className="text-2xl font-bold">
              Event History
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Client events and their
              individual vendor bookings.
            </p>
          </div>

          <div className="space-y-6">
            {client.events.map(
              (event) => (
                <article
                  key={
                    event.orderId
                  }
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-200 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xl font-bold">
                            {
                              event.eventName
                            }
                          </h4>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                              event.status,
                            )}`}
                          >
                            {prettyStatus(
                              event.status,
                            )}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {
                            event.eventType
                          }{" "}
                          •{" "}
                          {
                            event.guests
                          }{" "}
                          guests
                        </p>
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-sm text-slate-500">
                          Booking Value
                        </p>

                        <p className="mt-1 text-xl font-bold">
                          {formatCurrency(
                            event.finalAmount,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Event Date
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          {formatDate(
                            event.eventDate,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Start Time
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          {event.eventTime ||
                            "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Vendor Bookings
                        </p>

                        <p className="mt-1 text-sm font-medium">
                          {
                            event.vendorBookingCount
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Order ID
                        </p>

                        <p className="mt-1 break-all font-mono text-xs text-slate-600">
                          {
                            event.orderId
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h5 className="font-bold">
                      Vendor Bookings
                    </h5>

                    <div className="mt-4 space-y-3">
                      {event.bookings.map(
                        (
                          booking,
                        ) => (
                          <div
                            key={
                              booking.bookingId
                            }
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <p className="font-semibold">
                                  {
                                    booking.vendorName
                                  }
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  {
                                    booking.serviceName
                                  }
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                                      booking.bookingStatus,
                                    )}`}
                                  >
                                    {prettyStatus(
                                      booking.bookingStatus,
                                    )}
                                  </span>

                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                                      booking.paymentStatus,
                                    )}`}
                                  >
                                    Payment:{" "}
                                    {prettyStatus(
                                      booking.paymentStatus,
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="lg:text-right">
                                <p className="text-sm text-slate-500">
                                  Amount
                                </p>

                                <p className="mt-1 text-lg font-bold">
                                  {formatCurrency(
                                    booking.amount,
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Remaining:{" "}
                                  {formatCurrency(
                                    booking.remaining,
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                              <Link
                                href={`/bookings/${encodeURIComponent(
                                  booking.bookingId,
                                )}`}
                                className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                              >
                                Booking Details
                              </Link>

                              {booking.vendorId ? (
                                <Link
                                  href={`/vendors/${encodeURIComponent(
                                    booking.vendorId,
                                  )}`}
                                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Vendor Details
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        ),
                      )}

                      {event.bookings
                        .length ===
                      0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                          No vendor bookings
                          are attached to this
                          event.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ),
            )}

            {client.events.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="font-semibold text-slate-700">
                  No events yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  This Client has not
                  created any events.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}