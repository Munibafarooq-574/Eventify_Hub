 "use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DailyFinance = {
  date: string;
  bookingCollections: number;
  subscriptionRevenue: number;
  completedRefunds: number;
};

export default function FinanceRevenueChart({
  data,
}: {
  data: DailyFinance[];
}) {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Financial Activity</h2>
        <p className="mt-4 text-sm text-slate-500">
          No financial activity found for the selected date range.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Financial Activity
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Daily booking collections, verified subscription revenue
        and completed refunds (PKR).
      </p>

      <div className="mt-6 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              minTickGap={25}
            />

            <YAxis
              tick={{ fontSize: 11 }}
              width={65}
            />

            <Tooltip
              formatter={(value, name) => [
                `Rs ${Number(value ?? 0).toLocaleString("en-PK")}`,
                String(name),
              ]}
            />

            <Legend />

            <Line
              type="monotone"
              dataKey="bookingCollections"
              name="Booking Collections"
              stroke="#2563eb"
              strokeWidth={2}
            />

            <Line
              type="monotone"
              dataKey="subscriptionRevenue"
              name="Subscription Revenue"
              stroke="#7D0C72"
              strokeWidth={2}
            />

            <Line
              type="monotone"
              dataKey="completedRefunds"
              name="Completed Refunds"
              stroke="#dc2626"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}