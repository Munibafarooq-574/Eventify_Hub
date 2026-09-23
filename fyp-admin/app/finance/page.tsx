import Link from "next/link";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import FinanceRevenueChart from "@/components/FinanceRevenueChart";
import RecentFinancialTransactions from "@/components/RecentFinancialTransactions";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type Stats = {
  count: number;
  amount: number;
};
type FinanceOverview = {
  currency: string;

  dailyChart: {
    date: string;
    bookingCollections: number;
    subscriptionRevenue: number;
    completedRefunds: number;
  }[];
  bookingPayments: {
    successful: Stats;
    pending: Stats;
    failed: Stats;
  };
  subscriptionPayments: {
    paid: Stats;
    pending: Stats;
    failed: Stats;
  };

    subscriptionRevenueByPlan: {
    basic: {
      paidTransactions: number;
      revenue: number;
    };
    growth: {
      paidTransactions: number;
      revenue: number;
    };
    premium: {
      paidTransactions: number;
      revenue: number;
    };
  };
  refunds: {
    completed: Stats;
    pending: Stats;
    processing: Stats;
  };
  summary: {
    bookingPaymentsCollected: number;
    subscriptionRevenue: number;
    grossTransactions: number;
    completedRefunds: number;
    netTransactions: number;
    platformRevenue: number;
  };
};

function formatAmount(amount: number) {
  return `Rs ${Number(amount || 0).toLocaleString("en-PK")}`;
}

function StatCard({
  title,
  amount,
  description,
}: {
  title: string;
  amount: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {formatAmount(amount)}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

const sidebarItemClass = (active = false) =>
  `flex items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
    active
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

  export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}) {
  const { from, to } = await searchParams;

  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const params = new URLSearchParams();

if (from) params.set("from", from);
if (to) params.set("to", to);

const query = params.toString();

const response = await backendFetch(
  `/admin/finance/overview${query ? `?${query}` : ""}`,
  {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (response.status === 401 || response.status === 403) {
    redirect("/login");
  }

  if (!response.ok) {
  const isInvalidDateRange = response.status === 400;

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Finance Overview
        </h1>

        <p className="mt-4 text-sm text-red-600">
          {isInvalidDateRange
            ? "Invalid date range. Please select valid From and To dates, with From not later than To."
            : `Unable to load finance data. API status: ${response.status}`}
        </p>

        <Link
          href="/finance"
          className="mt-5 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Reset Filters
        </Link>
      </div>
    </main>
  );
}

  const data: FinanceOverview = await response.json();

  const today = new Date();

const formatDate = (date: Date) =>
  date.toISOString().slice(0, 10);

const getPastDate = (days: number) => {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() - (days - 1));
  return formatDate(date);
};

const todayString = formatDate(today);

const sevenDaysUrl =
  `/finance?from=${getPastDate(7)}&to=${todayString}`;

const thirtyDaysUrl =
  `/finance?from=${getPastDate(30)}&to=${todayString}`;

const isAllTime = !from && !to;

const thisMonthStart = `${todayString.slice(0, 7)}-01`;

const thisMonthUrl =
  `/finance?from=${thisMonthStart}&to=${todayString}`;

  const thisYearStart = `${todayString.slice(0, 4)}-01-01`;

const thisYearUrl =
  `/finance?from=${thisYearStart}&to=${todayString}`;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen flex-col lg:flex-row">
           <div className="lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
          <AdminSidebar />
        </div>


        {/* MAIN CONTENT */}

        <section className="min-w-0 flex-1">

          {/* HEADER */}

          <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8 lg:px-10">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Finance
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Finance Overview
                </h2>
              </div>
            </div>
          </header>

          {/* FINANCE DATA */}

          <div className="mx-auto max-w-[1600px] space-y-8 px-5 py-7 sm:px-8 lg:px-10">

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Finance Overview
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {from && to
  ? `Financial summary from ${from} to ${to} in ${data.currency}.`
  : `All-time financial summary in ${data.currency}.`}
              </p>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
  <h2 className="text-sm font-semibold text-slate-900">
    Filter by Date
  </h2>

  <div className="mt-4 flex flex-wrap gap-3">
    {[
      { label: "All Time", href: "/finance", active: isAllTime },
      { label: "Last 7 Days", href: sevenDaysUrl, active: from === getPastDate(7) && to === todayString },
      { label: "Last 30 Days", href: thirtyDaysUrl, active: from === getPastDate(30) && to === todayString },
      {
  label: "This Month",
  href: thisMonthUrl,
  active: from === thisMonthStart && to === todayString,
},

{
  label: "This Year",
  href: thisYearUrl,
  active: from === thisYearStart && to === todayString,
},
    ].map((filter) => (
      <Link
        key={filter.label}
        href={filter.href}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
          filter.active
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        {filter.label}
      </Link>
    ))}
  </div>
</section>

{/* CUSTOM DATE RANGE */}

<form
  action="/finance"
  method="GET"
  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
>
  <h2 className="text-sm font-semibold text-slate-900">
    Custom Date Range
  </h2>

  <div className="mt-4 flex flex-wrap items-end gap-4">
    <div className="flex flex-col gap-2">
      <label
        htmlFor="finance-from"
        className="text-sm font-medium text-slate-600"
      >
        From
      </label>

      <input
        id="finance-from"
        name="from"
        type="date"
        defaultValue={from ?? ""}
        required
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>

    <div className="flex flex-col gap-2">
      <label
        htmlFor="finance-to"
        className="text-sm font-medium text-slate-600"
      >
        To
      </label>

      <input
        id="finance-to"
        name="to"
        type="date"
        defaultValue={to ?? ""}
        required
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>

    <button
      type="submit"
      className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      Apply Filter
    </button>

    <Link
      href="/finance"
      className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      Reset
    </Link>
  </div>
</form>

{/* FINANCIAL ACTIVITY CHART */}

<FinanceRevenueChart data={data.dailyChart} />

            {/* PLATFORM REVENUE */}

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Eventify Hub Revenue
              </h2>

              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  title="Verified Subscription Revenue"
                  amount={data.summary.subscriptionRevenue}
                  description={`${data.subscriptionPayments.paid.count} verified paid subscription records`}
                />

                <StatCard
                  title="Platform Revenue"
                  amount={data.summary.platformRevenue}
                  description="Currently includes verified subscription payments only."
                />
              </div>
            </section>

            {/* BOOKING PAYMENTS */}

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Booking Payments
              </h2>

              <p className="text-sm text-slate-500">
                Client-to-Vendor payment activity. These collections
                are not Eventify Hub revenue.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  title="Successful Collections"
                  amount={data.bookingPayments.successful.amount}
                  description={`${data.bookingPayments.successful.count} successful payments`}
                />

                <StatCard
                  title="Pending Payments"
                  amount={data.bookingPayments.pending.amount}
                  description={`${data.bookingPayments.pending.count} pending payments`}
                />

                <StatCard
                  title="Failed Payments"
                  amount={data.bookingPayments.failed.amount}
                  description={`${data.bookingPayments.failed.count} failed payments`}
                />
              </div>
            </section>

            {/* SUBSCRIPTION PAYMENTS */}

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Subscription Payments
              </h2>

              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  title="Verified Paid"
                  amount={data.subscriptionPayments.paid.amount}
                  description={`${data.subscriptionPayments.paid.count} verified records`}
                />

                <StatCard
                  title="Pending (Uncollected)"
                  amount={data.subscriptionPayments.pending.amount}
                  description={`${data.subscriptionPayments.pending.count} pending records`}
                />

                <StatCard
                  title="Failed (Not Collected)"
                  amount={data.subscriptionPayments.failed.amount}
                  description={`${data.subscriptionPayments.failed.count} failed records`}
                />
              </div>
            </section>

{/* SUBSCRIPTION REVENUE BREAKDOWN */}

<section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
  <h2 className="text-lg font-semibold text-slate-900">
    Subscription Revenue Breakdown
  </h2>

  <p className="mt-2 text-sm text-slate-500">
    Revenue from verified subscription payments, grouped by plan.
    Each successful purchase or renewal counts as a separate transaction.
  </p>

  <div className="mt-5 overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
        <tr>
          <th className="px-4 py-3 font-semibold">Plan</th>
          <th className="px-4 py-3 text-right font-semibold">
            Paid Transactions
          </th>
          <th className="px-4 py-3 text-right font-semibold">
            Revenue
          </th>
        </tr>
      </thead>

      <tbody className="divide-y divide-slate-100">
        {(
          [
            ["Basic", data.subscriptionRevenueByPlan.basic],
            ["Growth", data.subscriptionRevenueByPlan.growth],
            ["Premium", data.subscriptionRevenueByPlan.premium],
          ] as const
        ).map(([plan, stats]) => (
          <tr key={plan}>
            <td className="px-4 py-4 font-medium text-slate-900">
              {plan}
            </td>

            <td className="px-4 py-4 text-right text-slate-700">
              {stats.paidTransactions.toLocaleString("en-PK")}
            </td>

            <td className="px-4 py-4 text-right font-semibold text-slate-900">
              {formatAmount(stats.revenue)}
            </td>
          </tr>
        ))}
      </tbody>

      <tfoot className="border-t-2 border-slate-200 bg-slate-50">
        <tr>
          <td className="px-4 py-4 font-bold text-slate-900">
            Total
          </td>

          <td className="px-4 py-4 text-right font-bold text-slate-900">
            {(
              data.subscriptionRevenueByPlan.basic.paidTransactions +
              data.subscriptionRevenueByPlan.growth.paidTransactions +
              data.subscriptionRevenueByPlan.premium.paidTransactions
            ).toLocaleString("en-PK")}
          </td>

          <td className="px-4 py-4 text-right font-bold text-slate-900">
            {formatAmount(
              data.subscriptionRevenueByPlan.basic.revenue +
                data.subscriptionRevenueByPlan.growth.revenue +
                data.subscriptionRevenueByPlan.premium.revenue
            )}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</section>
            {/* BOOKING REFUNDS */}

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Booking Refunds
              </h2>

              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  title="Completed Refunds"
                  amount={data.refunds.completed.amount}
                  description={`${data.refunds.completed.count} completed refunds`}
                />

                <StatCard
                  title="Pending Refunds"
                  amount={data.refunds.pending.amount}
                  description={`${data.refunds.pending.count} pending refunds`}
                />

                <StatCard
                  title="Processing Refunds"
                  amount={data.refunds.processing.amount}
                  description={`${data.refunds.processing.count} processing refunds`}
                />
              </div>
            </section>

            {/* RECENT FINANCIAL TRANSACTIONS */}

          <RecentFinancialTransactions from={from} to={to} />

            {/* TRANSACTION SUMMARY */}

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Transaction Summary
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Combined transaction volume is shown separately
                from platform revenue.
              </p>

              <div className="mt-5 space-y-4">
                {[
                  {
                    label: "Gross Transaction Volume",
                    value: data.summary.grossTransactions,
                  },
                  {
                    label: "Completed Refunds",
                    value: data.summary.completedRefunds,
                  },
                  {
                    label: "Net Transaction Volume",
                    value: data.summary.netTransactions,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between border-b border-slate-100 pb-3"
                  >
                    <span className="text-sm text-slate-600">
                      {item.label}
                    </span>

                    <span className="font-semibold text-slate-900">
                      {formatAmount(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <p className="text-xs text-slate-500">
            Financial figures and daily chart reflect the selected date range.
Date boundaries use UTC. Eventify Hub earns revenue from verified
vendor subscriptions only; booking payments are not platform revenue.
</p>

          </div>
        </section>
      </div>
    </main>
  );
}