import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { verifyAdminSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await verifyAdminSession();

  if (!session.authenticated || !session.dashboard) {
    redirect("/login");
  }

  const dashboard = session.dashboard;

  return (
    <main className="min-h-screen bg-[#f5f6f8]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Eventify Hub
            </p>

            <h1 className="text-xl font-semibold text-gray-950">
              Admin Dashboard
            </h1>
          </div>

          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <p className="text-sm font-medium text-gray-500">
            Overview
          </p>

          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">
            Platform summary
          </h2>

          <p className="mt-2 text-gray-600">
            Secure Admin authentication is connected
            to the existing NestJS backend.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Bookings"
            value={dashboard.totalBookings}
          />

          <SummaryCard
            title="Completed Bookings"
            value={dashboard.completedBookings}
          />

          <SummaryCard
            title="Gross Booking Value"
            value={`PKR ${dashboard.grossBookingValue.toLocaleString()}`}
          />

          <SummaryCard
            title="Pending Payouts"
            value={`PKR ${dashboard.pendingPayouts.toLocaleString()}`}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="font-semibold text-gray-950">
            Phase 1 Authentication Status
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <StatusItem
              title="Admin JWT"
              status="Protected"
            />

            <StatusItem
              title="HttpOnly Cookie"
              status="Active"
            />

            <StatusItem
              title="Backend Role Guard"
              status="Verified"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6">
      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
        {value}
      </p>
    </article>
  );
}

function StatusItem({
  title,
  status,
}: {
  title: string;
  status: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-1 font-semibold text-gray-950">
        {status}
      </p>
    </div>
  );
}