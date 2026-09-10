import Link from "next/link";
import { redirect } from "next/navigation";

import ClientsAutoRefresh from "@/components/ClientsAutoRefresh";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

const PAGE_SIZE = 20;
const FETCH_LIMIT = PAGE_SIZE + 1;

type ClientRow = {
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
  lastEventAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type PageProps = {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
};

function normalizePage(value?: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function clientsUrl(search: string, page: number) {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("search", search.trim());
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/clients?${query}` : "/clients";
}

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "CL";
  }

  return parts
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function ClientsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const search =
    typeof params.search === "string"
      ? params.search.trim()
      : "";

  const page = normalizePage(params.page);

  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const skip = (page - 1) * PAGE_SIZE;

  const backendParams = new URLSearchParams({
    limit: String(FETCH_LIMIT),
    skip: String(skip),
  });

  if (search) {
    backendParams.set("search", search);
  }

  const response = await backendFetch(
    `/admin/clients?${backendParams.toString()}`,
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
    throw new Error("Unable to load clients.");
  }

  const rawClients =
    (await response.json()) as ClientRow[];

  if (
    rawClients.length === 0 &&
    page > 1
  ) {
    redirect(clientsUrl(search, 1));
  }

  const hasNext =
    rawClients.length > PAGE_SIZE;

  const clients =
    rawClients.slice(0, PAGE_SIZE);

  const visibleTotalEvents =
    clients.reduce(
      (sum, client) =>
        sum + Number(client.totalEvents || 0),
      0,
    );

  const visibleVendorBookings =
    clients.reduce(
      (sum, client) =>
        sum +
        Number(
          client.totalVendorBookings || 0,
        ),
      0,
    );

  const visibleBookingValue =
    clients.reduce(
      (sum, client) =>
        sum + Number(client.totalSpent || 0),
      0,
    );

  const onlineCount =
    clients.filter(
      (client) => client.isOnline,
    ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      {/* Automatically refresh server data every 10 seconds. */}
      <ClientsAutoRefresh />

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white px-5 py-6 lg:block">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Eventify Hub
            </p>

            <h1 className="mt-2 text-2xl font-bold">
              Admin Panel
            </h1>
          </div>

          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Dashboard
            </Link>

            <Link
              href="/bookings"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Bookings
            </Link>

            <Link
              href="/vendors"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Vendors
            </Link>

            <Link
              href="/clients"
              className="block rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Clients
            </Link>

            <div className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300">
              Categories
            </div>

            <div className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300">
              Finance
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">

            {/* HEADER */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Core Management
                </p>

                <h2 className="mt-1 text-3xl font-bold tracking-tight">
                  Clients
                </h2>

                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  View Client accounts, event activity and
                  vendor booking history.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>

                Auto refresh: 10s
              </div>
            </div>

            {/* SUMMARY */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Showing Clients
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {clients.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Events on Page
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {visibleTotalEvents}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Vendor Bookings
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {visibleVendorBookings}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Online Now
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {onlineCount}
                </p>
              </div>
            </section>

            {/* SEARCH */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <form
                action="/clients"
                method="GET"
                className="flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="search"
                  name="search"
                  defaultValue={search}
                  placeholder="Search by name, email or phone"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Search
                </button>

                {search ? (
                  <Link
                    href="/clients"
                    className="rounded-xl border border-slate-300 px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Reset
                  </Link>
                ) : null}
              </form>
            </section>

            {/* CLIENT TABLE */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Client
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Phone
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Events
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Vendor Bookings
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Booking Value
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Activity
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Joined
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {clients.map((client) => (
                      <tr
                        key={client.clientId}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex min-w-[220px] items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                              {initials(client.name)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {client.name}
                              </p>

                              <p className="truncate text-sm text-slate-500">
                                {client.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {client.phoneNumber}
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-sm font-semibold">
                            {client.totalEvents}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {client.completedEvents} completed
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold">
                          {client.totalVendorBookings}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold">
                            {formatCurrency(client.totalSpent)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Event/order value
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                                client.isOnline
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {client.isOnline
                                ? "Online"
                                : "Offline"}
                            </span>

                            {!client.isOnline &&
                            client.lastSeen ? (
                              <span className="text-xs text-slate-500">
                                Last seen:{" "}
                                {formatDateTime(
                                  client.lastSeen,
                                )}
                              </span>
                            ) : null}

                            <span className="text-xs text-slate-500">
                              Last event:{" "}
                              {formatDate(
                                client.lastEventAt,
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(client.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/clients/${encodeURIComponent(
                              client.clientId,
                            )}`}
                            className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            View details
                          </Link>
                        </td>
                      </tr>
                    ))}

                    {clients.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-16 text-center"
                        >
                          <p className="font-semibold text-slate-700">
                            No clients found
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Try another search term.
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-600">
                    Page{" "}
                    <span className="font-semibold">
                      {page}
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Visible booking value:{" "}
                    {formatCurrency(
                      visibleBookingValue,
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link
                      href={clientsUrl(
                        search,
                        page - 1,
                      )}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-300">
                      Previous
                    </span>
                  )}

                  {hasNext ? (
                    <Link
                      href={clientsUrl(
                        search,
                        page + 1,
                      )}
                      className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
                      Next
                    </span>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}