import { redirect } from "next/navigation";

import AdminSidebar from "@/components/AdminSidebar";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type VendorPerformance = {
  vendorId: string;
  vendorName: string;
  brandName: string;
  city: string;
  totalBookings: number;
  completed: number;
  cancellationRate: number;
};

type CampaignAnalytics = {
  summary: {
    totalCampaigns: number;
    activeCampaigns: number;
    impressions: number;
    views: number;
    clicks: number;
    packageVisits: number;
    ctr: number;
  };

  campaignPerformance: Array<{
    _id: string;
    title?: string | null;
    status?: string | null;
    vendorId?: string | null;
    vendorName: string;
    brandName?: string | null;
    impressions: number;
    clicks: number;
    packageVisits: number;
    ctr: number;
  }>;

  vendorPerformance: Array<{
    vendorId: string;
    vendorName: string;
    brandName?: string | null;
    totalCampaigns: number;
    activeCampaigns: number;
    impressions: number;
    clicks: number;
    packageVisits: number;
    ctr: number;
  }>;
};
type PlatformAnalytics = {
  users: {
    totalClients: number;
    totalVendors: number;
  };

  bookings: {
    total: number;
    completed: number;
    cancelled: number;
  };

  subscriptions: {
    totalCurrent: number;

    planDistribution: {
      basic: number;
      growth: number;
      premium: number;
    };

    statusDistribution: {
      trial: number;
      active: number;
      expired: number;
      cancelled: number;
    };
  };

  categoryPerformance: Array<{
    category: string;
    totalBookings: number;
    completed: number;
    cancelled: number;
  }>;

  trends: {
    months: number;

    bookings: Array<{
      year: number;
      month: number;
      total: number;
      completed: number;
      cancelled: number;
    }>;

    subscriptions: Array<{
      year: number;
      month: number;
      total: number;
      basic: number;
      growth: number;
      premium: number;
    }>;
  };
};

function monthLabel(
  year: number,
  month: number,
) {
  return new Intl.DateTimeFormat(
    "en-PK",
    {
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(
      year,
      month - 1,
      1,
    ),
  );
}

export default async function AnalyticsPage() {
  const token =
    await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  let analytics:
    | PlatformAnalytics
    | null = null;

  let vendors:
    VendorPerformance[] = [];

  let campaignAnalytics:
    | CampaignAnalytics
    | null = null;

  let errorMessage = "";

  try {
    const [
      analyticsResponse,
      vendorsResponse,
      campaignResponse,
    ] = await Promise.all([
      backendFetch(
        "/admin/analytics/platform?months=6",
        {
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      ),

      backendFetch(
        "/admin/analytics/vendor-performance",
        {
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      ),

      backendFetch(
        "/admin/campaigns/analytics/summary",
        {
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      ),
    ]);

    if (
      analyticsResponse.status === 401 ||
      analyticsResponse.status === 403 ||
      vendorsResponse.status === 401 ||
      vendorsResponse.status === 403 ||
      campaignResponse.status === 401 ||
      campaignResponse.status === 403
    ) {
      redirect("/login");
    }

    if (
      !analyticsResponse.ok ||
      !vendorsResponse.ok ||
      !campaignResponse.ok
    ) {
      errorMessage =
        "Unable to load admin analytics.";
    } else {
      analytics =
        (await analyticsResponse.json()) as PlatformAnalytics;

      const vendorPayload =
        await vendorsResponse.json();

      vendors =
        Array.isArray(vendorPayload)
          ? vendorPayload
          : [];

      campaignAnalytics =
        (await campaignResponse.json()) as CampaignAnalytics;
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error
    ) {
      throw error;
    }

    errorMessage =
      "Unable to connect to the backend.";
  }

  const cards = analytics
    ? [
        ["Total Clients", analytics.users.totalClients],
        ["Total Vendors", analytics.users.totalVendors],
        ["Total Bookings", analytics.bookings.total],
        ["Completed Bookings", analytics.bookings.completed],
        ["Cancelled Bookings", analytics.bookings.cancelled],
        ["Current Subscriptions", analytics.subscriptions.totalCurrent],
      ]
    : [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="lg:flex">
        <AdminSidebar />

        <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                Platform Analytics
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Admin Analytics
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Booking, vendor, category and subscription analytics.
              </p>
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
                {errorMessage}
              </div>
            ) : analytics ? (
              <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {cards.map(
                    ([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-2xl border border-slate-200 bg-white p-5"
                      >
                        <p className="text-sm text-slate-500">
                          {label}
                        </p>

                        <p className="mt-2 text-3xl font-bold">
                          {value}
                        </p>
                      </div>
                    ),
                  )}
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-bold">
                      Subscription Plans
                    </h2>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      {[
                        ["Basic", analytics.subscriptions.planDistribution.basic],
                        ["Growth", analytics.subscriptions.planDistribution.growth],
                        ["Premium", analytics.subscriptions.planDistribution.premium],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          className="rounded-xl bg-slate-50 p-4"
                        >
                          <p className="text-xs font-semibold text-slate-500">
                            {label}
                          </p>

                          <p className="mt-2 text-2xl font-bold">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-bold">
                      Subscription Status
                    </h2>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ["Trial", analytics.subscriptions.statusDistribution.trial],
                        ["Active", analytics.subscriptions.statusDistribution.active],
                        ["Expired", analytics.subscriptions.statusDistribution.expired],
                        ["Cancelled", analytics.subscriptions.statusDistribution.cancelled],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          className="rounded-xl bg-slate-50 p-4"
                        >
                          <p className="text-xs font-semibold text-slate-500">
                            {label}
                          </p>

                          <p className="mt-2 text-2xl font-bold">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="font-bold">
                      Booking Trend
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Last 6 months
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[650px] w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Month</th>
                          <th className="px-5 py-4">Total</th>
                          <th className="px-5 py-4">Completed</th>
                          <th className="px-5 py-4">Cancelled</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {analytics.trends.bookings.map(
                          (item) => (
                            <tr
                              key={`${item.year}-${item.month}`}
                            >
                              <td className="px-5 py-4 font-semibold">
                                {monthLabel(item.year, item.month)}
                              </td>
                              <td className="px-5 py-4">{item.total}</td>
                              <td className="px-5 py-4">{item.completed}</td>
                              <td className="px-5 py-4">{item.cancelled}</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="font-bold">
                      Subscription Trend
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Last 6 months
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[700px] w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Month</th>
                          <th className="px-5 py-4">Total</th>
                          <th className="px-5 py-4">Basic</th>
                          <th className="px-5 py-4">Growth</th>
                          <th className="px-5 py-4">Premium</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {analytics.trends.subscriptions.map(
                          (item) => (
                            <tr
                              key={`${item.year}-${item.month}`}
                            >
                              <td className="px-5 py-4 font-semibold">
                                {monthLabel(item.year, item.month)}
                              </td>
                              <td className="px-5 py-4">{item.total}</td>
                              <td className="px-5 py-4">{item.basic}</td>
                              <td className="px-5 py-4">{item.growth}</td>
                              <td className="px-5 py-4">{item.premium}</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>


                {campaignAnalytics ? (
                  <section className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold">
                        Campaign Performance Analytics
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Existing sponsored campaign tracking data.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {[
                        [
                          "Total Campaigns",
                          campaignAnalytics.summary.totalCampaigns,
                        ],
                        [
                          "Active Campaigns",
                          campaignAnalytics.summary.activeCampaigns,
                        ],
                        [
                          "Impressions / Views",
                          campaignAnalytics.summary.impressions,
                        ],
                        [
                          "Clicks",
                          campaignAnalytics.summary.clicks,
                        ],
                        [
                          "Package Visits",
                          campaignAnalytics.summary.packageVisits,
                        ],
                        [
                          "CTR",
                          `${campaignAnalytics.summary.ctr}%`,
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          className="rounded-2xl border border-slate-200 bg-white p-5"
                        >
                          <p className="text-sm text-slate-500">
                            {label}
                          </p>

                          <p className="mt-2 text-3xl font-bold">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <h3 className="font-bold">
                          Campaign Performance
                        </h3>
                      </div>

                      {campaignAnalytics.campaignPerformance.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">
                          No campaign analytics available.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-[800px] w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                              <tr>
                                <th className="px-5 py-4">
                                  Campaign
                                </th>

                                <th className="px-5 py-4">
                                  Vendor
                                </th>

                                <th className="px-5 py-4">
                                  Views
                                </th>

                                <th className="px-5 py-4">
                                  Clicks
                                </th>

                                <th className="px-5 py-4">
                                  Package Visits
                                </th>

                                <th className="px-5 py-4">
                                  CTR
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                              {campaignAnalytics.campaignPerformance.map(
                                (campaign) => (
                                  <tr key={campaign._id}>
                                    <td className="px-5 py-4">
                                      <p className="font-semibold">
                                        {campaign.title || "Untitled Campaign"}
                                      </p>

                                      <p className="mt-1 text-xs uppercase text-slate-500">
                                        {campaign.status || "-"}
                                      </p>
                                    </td>

                                    <td className="px-5 py-4">
                                      {campaign.vendorName}
                                    </td>

                                    <td className="px-5 py-4">
                                      {campaign.impressions}
                                    </td>

                                    <td className="px-5 py-4">
                                      {campaign.clicks}
                                    </td>

                                    <td className="px-5 py-4">
                                      {campaign.packageVisits}
                                    </td>

                                    <td className="px-5 py-4">
                                      {campaign.ctr}%
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <h3 className="font-bold">
                          Vendor Campaign Performance
                        </h3>
                      </div>

                      {campaignAnalytics.vendorPerformance.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">
                          No vendor campaign analytics available.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-[850px] w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                              <tr>
                                <th className="px-5 py-4">
                                  Vendor
                                </th>

                                <th className="px-5 py-4">
                                  Campaigns
                                </th>

                                <th className="px-5 py-4">
                                  Active
                                </th>

                                <th className="px-5 py-4">
                                  Views
                                </th>

                                <th className="px-5 py-4">
                                  Clicks
                                </th>

                                <th className="px-5 py-4">
                                  Package Visits
                                </th>

                                <th className="px-5 py-4">
                                  CTR
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                              {campaignAnalytics.vendorPerformance.map(
                                (vendor) => (
                                  <tr key={vendor.vendorId}>
                                    <td className="px-5 py-4">
                                      <p className="font-semibold">
                                        {vendor.vendorName}
                                      </p>

                                      {vendor.brandName ? (
                                        <p className="mt-1 text-xs text-slate-500">
                                          {vendor.brandName}
                                        </p>
                                      ) : null}
                                    </td>

                                    <td className="px-5 py-4">
                                      {vendor.totalCampaigns}
                                    </td>

                                    <td className="px-5 py-4">
                                      {vendor.activeCampaigns}
                                    </td>

                                    <td className="px-5 py-4">
                                      {vendor.impressions}
                                    </td>

                                    <td className="px-5 py-4">
                                      {vendor.clicks}
                                    </td>

                                    <td className="px-5 py-4">
                                      {vendor.packageVisits}
                                    </td>

                                    <td className="px-5 py-4">
                                      {vendor.ctr}%
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                ) : null}
                <section className="grid gap-6 xl:grid-cols-2">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h2 className="font-bold">
                        Vendor Performance
                      </h2>
                    </div>

                    {vendors.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        No vendor performance data available.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-[600px] w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-5 py-4">Vendor</th>
                              <th className="px-5 py-4">Bookings</th>
                              <th className="px-5 py-4">Completed</th>
                              <th className="px-5 py-4">Cancellation</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {vendors.map(
                              (vendor) => (
                                <tr key={vendor.vendorId}>
                                  <td className="px-5 py-4">
                                    <p className="font-semibold">
                                      {vendor.vendorName}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {vendor.brandName}
                                    </p>
                                  </td>

                                  <td className="px-5 py-4">
                                    {vendor.totalBookings}
                                  </td>

                                  <td className="px-5 py-4">
                                    {vendor.completed}
                                  </td>

                                  <td className="px-5 py-4">
                                    {vendor.cancellationRate}%
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h2 className="font-bold">
                        Category Performance
                      </h2>
                    </div>

                    {analytics.categoryPerformance.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        No category performance data available.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-[560px] w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                              <th className="px-5 py-4">Category</th>
                              <th className="px-5 py-4">Bookings</th>
                              <th className="px-5 py-4">Completed</th>
                              <th className="px-5 py-4">Cancelled</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {analytics.categoryPerformance.map(
                              (item) => (
                                <tr key={item.category}>
                                  <td className="px-5 py-4 font-semibold">
                                    {item.category}
                                  </td>
                                  <td className="px-5 py-4">{item.totalBookings}</td>
                                  <td className="px-5 py-4">{item.completed}</td>
                                  <td className="px-5 py-4">{item.cancelled}</td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

