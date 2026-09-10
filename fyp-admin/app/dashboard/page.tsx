import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import RevenueChart from "@/components/RevenueChart";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type DashboardSummary = {
  totalBookings?: number;
  completedBookings?: number;
  grossBookingValue?: number;
  eventifyCommission?: number;
  vendorEarnings?: number;
  pendingPayouts?: number;
  totalRefunds?: number;
};

type RevenueAnalyticsItem = {
  year: number;
  month: number;
  monthlyBookingValue: number;
  platformCommission: number;
};

type PopularServiceItem = {
  service: string;
  bookings?: number;
};

type VendorPerformanceItem = {
  vendorId: string;

  vendorName?: string;
  brandName?: string;

  email?: string;
  phoneNumber?: string;
  city?: string;

  businessCategoryId?: string | null;

  totalBookings: number;
  completed: number;
  cancellationRate: number;
  revenue: number;
};

function formatCurrency(value: number | undefined) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function cleanText(
  value: string | null | undefined,
  fallback = "N/A",
) {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();

  if (
    !trimmed ||
    trimmed.toLowerCase() === "n/a"
  ) {
    return fallback;
  }

  return trimmed;
}

export default async function DashboardPage() {
  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  // --------------------------------------------------
  // Dashboard summary
  // --------------------------------------------------

  const response = await backendFetch(
    "/admin/dashboard",
    {
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
      "Unable to load admin dashboard.",
    );
  }

  const data: DashboardSummary =
    await response.json();

  // --------------------------------------------------
  // Revenue analytics
  // --------------------------------------------------

  const revenueResponse = await backendFetch(
    "/admin/analytics/revenue",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (
    revenueResponse.status === 401 ||
    revenueResponse.status === 403
  ) {
    redirect("/login");
  }

  let revenueData: RevenueAnalyticsItem[] = [];

  if (revenueResponse.ok) {
    revenueData =
      await revenueResponse.json();
  }

  // --------------------------------------------------
  // Popular services
  // --------------------------------------------------

  const popularServicesResponse =
    await backendFetch(
      "/admin/analytics/popular-services",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

  if (
    popularServicesResponse.status === 401 ||
    popularServicesResponse.status === 403
  ) {
    redirect("/login");
  }

  let popularServices: PopularServiceItem[] =
    [];

  if (popularServicesResponse.ok) {
    popularServices =
      await popularServicesResponse.json();
  }

  // --------------------------------------------------
  // Vendor performance
  // --------------------------------------------------

  const vendorPerformanceResponse =
    await backendFetch(
      "/admin/analytics/vendor-performance",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

  if (
    vendorPerformanceResponse.status ===
      401 ||
    vendorPerformanceResponse.status ===
      403
  ) {
    redirect("/login");
  }

  let vendorPerformance: VendorPerformanceItem[] =
    [];

  if (vendorPerformanceResponse.ok) {
    vendorPerformance =
      await vendorPerformanceResponse.json();
  }

  // --------------------------------------------------
  // Dashboard cards
  // --------------------------------------------------

  const cards = [
    {
      label: "Total Bookings",
      value: String(
        data.totalBookings || 0,
      ),
      hint: "All platform bookings",
    },

    {
      label: "Completed Bookings",
      value: String(
        data.completedBookings || 0,
      ),
      hint: "Successfully completed",
    },

    {
      label: "Gross Booking Value",
      value: formatCurrency(
        data.grossBookingValue,
      ),
      hint: "Total booking value",
    },

    {
      label: "Eventify Commission",
      value: formatCurrency(
        data.eventifyCommission,
      ),
      hint: "Platform earnings",
    },

    {
      label: "Vendor Earnings",
      value: formatCurrency(
        data.vendorEarnings,
      ),
      hint: "Vendor payable earnings",
    },

    {
      label: "Pending Payouts",
      value: formatCurrency(
        data.pendingPayouts,
      ),
      hint: "Awaiting settlement",
    },

    {
      label: "Total Refunds",
      value: formatCurrency(
        data.totalRefunds,
      ),
      hint: "Refunded amount",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        {/* ------------------------------------------------ */}
        {/* Sidebar */}
        {/* ------------------------------------------------ */}

        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Eventify Hub
            </p>

            <h1 className="mt-2 text-xl font-bold text-slate-950">
              Admin Panel
            </h1>
          </div>

          <nav className="flex-1 px-4 py-6">
            <a
              href="/dashboard"
              className="flex items-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Dashboard
            </a>

            <div className="mt-2 space-y-1">
              {[
                "Bookings",
                "Vendors",
                "Clients",
                "Categories",
                "Payments",
                "Payouts",
                "Refunds",
                "Disputes",
                "Analytics",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-400"
                >
                  {item}
                </button>
              ))}
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <LogoutButton />
          </div>
        </aside>

        {/* ------------------------------------------------ */}
        {/* Main */}
        {/* ------------------------------------------------ */}

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Administration
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  Dashboard
                </h2>
              </div>

              <div className="lg:hidden">
                <LogoutButton />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
            {/* ------------------------------------------------ */}
            {/* Platform overview */}
            {/* ------------------------------------------------ */}

            <section>
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Platform overview
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Current booking and finance
                  summary from Eventify Hub.
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                  <article
                    key={card.label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <p className="text-sm font-medium text-slate-500">
                      {card.label}
                    </p>

                    <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                      {card.value}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      {card.hint}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            {/* ------------------------------------------------ */}
            {/* Revenue + status */}
            {/* ------------------------------------------------ */}

            <section className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">
                      Revenue Analytics
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Monthly booking value and
                      Eventify Hub commission.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    Last 6 Months
                  </span>
                </div>

                <div className="mt-6">
                  {revenueData.length > 0 ? (
                    <RevenueChart
                      data={revenueData}
                    />
                  ) : (
                    <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                      <p className="text-sm text-slate-400">
                        No revenue analytics
                        available.
                      </p>
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-950">
                  Platform Status
                </h3>

                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <span className="text-sm text-slate-500">
                      Admin authentication
                    </span>

                    <span className="text-sm font-semibold text-emerald-600">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <span className="text-sm text-slate-500">
                      Backend authorization
                    </span>

                    <span className="text-sm font-semibold text-emerald-600">
                      Protected
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Dashboard API
                    </span>

                    <span className="text-sm font-semibold text-emerald-600">
                      Connected
                    </span>
                  </div>
                </div>
              </article>
            </section>

            {/* ------------------------------------------------ */}
            {/* Popular Services + Vendor Performance */}
            {/* ------------------------------------------------ */}

            <section className="mt-8 grid gap-6 xl:grid-cols-2">
              {/* Popular Services */}

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">
                    Popular Services
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Most booked packages across
                    Eventify Hub.
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  {popularServices.length > 0 ? (
                    popularServices
                      .slice(0, 10)
                      .map(
                        (
                          item,
                          index,
                        ) => (
                          <div
                            key={`${item.service}-${index}`}
                            className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {item.service ||
                                  "Unnamed Service"}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Rank #
                                {index +
                                  1}
                              </p>
                            </div>

                            <div className="ml-4 text-right">
                              <p className="text-sm font-semibold text-slate-950">
                                {Number(
                                  item.bookings ||
                                    0,
                                )}
                              </p>

                              <p className="text-xs text-slate-400">
                                bookings
                              </p>
                            </div>
                          </div>
                        ),
                      )
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                      <p className="text-sm text-slate-400">
                        No popular services data
                        available.
                      </p>
                    </div>
                  )}
                </div>
              </article>

              {/* ------------------------------------------------ */}
              {/* Top Vendor Performance */}
              {/* ------------------------------------------------ */}

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">
                    Top Vendor Performance
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Vendor business, contact details,
                    bookings and generated order
                    value.
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  {vendorPerformance.length >
                  0 ? (
                    vendorPerformance
                      .slice(0, 5)
                      .map(
                        (
                          vendor,
                          index,
                        ) => {
                          const brandName =
                            cleanText(
                              vendor.brandName,
                              "",
                            );

                          const vendorName =
                            cleanText(
                              vendor.vendorName,
                              "",
                            );

                          const email =
                            cleanText(
                              vendor.email,
                              "",
                            );

                          const phoneNumber =
                            cleanText(
                              vendor.phoneNumber,
                              "",
                            );

                          const city =
                            cleanText(
                              vendor.city,
                              "",
                            );

                          const hasVendorRecord =
                            Boolean(
                              brandName ||
                                vendorName ||
                                email ||
                                phoneNumber ||
                                city,
                            );

                          const primaryName =
                            brandName ||
                            vendorName ||
                            "Unknown Vendor";

                          return (
                            <div
                              key={`${vendor.vendorId}-${index}`}
                              className="rounded-xl border border-slate-200 bg-white p-4"
                            >
                              {/* Vendor heading */}

                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-bold text-slate-950">
                                      {
                                        primaryName
                                      }
                                    </p>

                                    {!hasVendorRecord && (
                                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                        Account
                                        not
                                        found
                                      </span>
                                    )}
                                  </div>

                                  {brandName &&
                                    vendorName && (
                                      <p className="mt-1 text-sm font-medium text-slate-600">
                                        {
                                          vendorName
                                        }
                                      </p>
                                    )}

                                  <p className="mt-1 text-xs text-slate-400">
                                    Rank #
                                    {index +
                                      1}
                                  </p>
                                </div>

                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-bold text-slate-950">
                                    {formatCurrency(
                                      vendor.revenue,
                                    )}
                                  </p>

                                  <p className="mt-1 text-[11px] text-slate-400">
                                    Order
                                    value
                                  </p>
                                </div>
                              </div>

                              {/* Contact information */}

                              {hasVendorRecord ? (
                                <div className="mt-4 rounded-lg bg-slate-50 px-3 py-3">
                                  <div className="grid gap-2 text-xs sm:grid-cols-2">
                                    <div>
                                      <p className="text-slate-400">
                                        Email
                                      </p>

                                      <p className="mt-0.5 break-all font-medium text-slate-700">
                                        {email ||
                                          "Not provided"}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-slate-400">
                                        Phone
                                      </p>

                                      <p className="mt-0.5 font-medium text-slate-700">
                                        {phoneNumber ||
                                          "Not provided"}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-slate-400">
                                        City
                                      </p>

                                      <p className="mt-0.5 font-medium text-slate-700">
                                        {city ||
                                          "Not provided"}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-slate-400">
                                        Vendor
                                        ID
                                      </p>

                                      <p className="mt-0.5 truncate font-medium text-slate-700">
                                        {vendor.vendorId ||
                                          "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                                  <p className="text-xs font-medium text-amber-800">
                                    Vendor
                                    account
                                    details
                                    could not
                                    be found
                                    for this
                                    booking
                                    record.
                                  </p>

                                  <p className="mt-1 break-all text-[11px] text-amber-700">
                                    Vendor
                                    ID:{" "}
                                    {vendor.vendorId ||
                                      "Missing"}
                                  </p>
                                </div>
                              )}

                              {/* Performance */}

                              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                                <div>
                                  <p className="text-xs text-slate-400">
                                    Bookings
                                  </p>

                                  <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {vendor.totalBookings ||
                                      0}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs text-slate-400">
                                    Completed
                                  </p>

                                  <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {vendor.completed ||
                                      0}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs text-slate-400">
                                    Cancellation
                                  </p>

                                  <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {Number(
                                      vendor.cancellationRate ||
                                        0,
                                    ).toFixed(
                                      1,
                                    )}
                                    %
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                      <p className="text-sm text-slate-400">
                        No vendor performance data
                        available.
                      </p>
                    </div>
                  )}
                </div>
              </article>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}