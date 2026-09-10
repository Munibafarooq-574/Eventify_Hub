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

type RevenueItem = {
  year: number;
  month: number;
  monthlyBookingValue: number;
  platformCommission: number;
};

type RevenueChartProps = {
  data: RevenueItem[];
};

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatCurrency(value: number) {
  return `PKR ${Number(value || 0).toLocaleString("en-PK")}`;
}

export default function RevenueChart({
  data,
}: RevenueChartProps) {
  const chartData = data.map((item) => ({
    label: `${monthNames[item.month - 1]} ${item.year}`,
    bookingValue: Number(item.monthlyBookingValue || 0),
    commission: Number(item.platformCommission || 0),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
          />

          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) =>
              Number(value).toLocaleString("en-PK")
            }
          />

          <Tooltip
            formatter={(value) =>
              formatCurrency(Number(value || 0))
            }
          />

          <Legend />

          <Line
            type="monotone"
            dataKey="bookingValue"
            name="Booking Value"
            stroke="#0f172a"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />

          <Line
            type="monotone"
            dataKey="commission"
            name="Platform Commission"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}