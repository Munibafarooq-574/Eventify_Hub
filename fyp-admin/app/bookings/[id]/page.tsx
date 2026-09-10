import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import LogoutButton from "@/components/LogoutButton";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type Person = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  contactDetails?: {
    brandName?: string;
    bookingEmail?: string;
    contactNumber?: string;
    city?: string;
  };
};

type VendorOrder = {
  _id?: string;
  vendorId?: Person;
  serviceName?: string;
  price?: number;
  packageId?: string | null;

  status?: string;
  paymentStatus?: string;

  downPaymentAmount?: number;
  remainingAmount?: number;

  eventStartDateTime?: string;
  eventEndDateTime?: string;

  acceptedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

type Order = {
  _id?: string;
  organizerId?: Person;

  eventName?: string;
  eventType?: string;
  eventDate?: string;
  eventTime?: string;
  eventDuration?: number | string;
  guests?: number;

  createdAt?: string;
  updatedAt?: string;
};

type Payment = {
  _id?: string;
  amount?: number;
  status?: string;
  paymentType?: string;
  createdAt?: string;
};

type Payout = {
  _id?: string;
  grossAmount?: number;
  payoutAmount?: number;
  status?: string;
  createdAt?: string;
  paidAt?: string | null;
};

type Refund = {
  _id?: string;
  amountPaid?: number;
  refundAmount?: number;
  withheldAmount?: number;
  status?: string;
  createdAt?: string;
  paidAt?: string | null;
};

type BookingDetailResponse = {
  vendorOrder: VendorOrder;
  order?: Order | null;
  payments?: Payment[];
  payout?: Payout | null;
  refund?: Refund | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const money = (value?: number | null) =>
  `Rs ${Number(value || 0).toLocaleString("en-PK")}`;

const text = (value?: string | null) => {
  const cleaned = value?.trim();
  return cleaned || "N/A";
};

const formatDate = (value?: string | null) => {
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

const formatDateTime = (value?: string | null) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const statusClass = (status?: string | null) => {
  const value = status?.toLowerCase();

  if (
    value === "completed" ||
    value === "success" ||
    value === "paid"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value === "accepted" ||
    value === "processing"
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    value === "pending" ||
    value === "payment_required"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    value === "cancelled" ||
    value === "cancelled_by_vendor" ||
    value === "rejected" ||
    value === "failed" ||
    value === "expired"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
};

export default async function BookingDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;

  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const response = await backendFetch(
    `/admin/bookings/${encodeURIComponent(id)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (response.status === 401 || response.status === 403) {
    redirect("/login");
  }

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Unable to load booking details.");
  }

  const data =
    (await response.json()) as BookingDetailResponse | null;

  if (!data?.vendorOrder) {
    notFound();
  }

  const vendorOrder = data.vendorOrder;
  const order = data.order;
  const vendor = vendorOrder.vendorId;
  const client = order?.organizerId;

  const vendorName =
    vendor?.contactDetails?.brandName?.trim() ||
    vendor?.name?.trim() ||
    "N/A";

  const vendorEmail =
    vendor?.contactDetails?.bookingEmail?.trim() ||
    vendor?.email?.trim() ||
    "N/A";

  const vendorPhone =
    vendor?.contactDetails?.contactNumber?.trim() ||
    vendor?.phone_number?.trim() ||
    vendor?.phone?.trim() ||
    "N/A";

  const clientPhone =
    client?.phone_number?.trim() ||
    client?.phone?.trim() ||
    "N/A";

  const payments = Array.isArray(data.payments)
    ? data.payments
    : [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Eventify Hub
            </p>

            <h1 className="mt-2 text-xl font-bold">
              Admin Console
            </h1>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            <Link
              href="/dashboard"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Dashboard
            </Link>

            <Link
              href="/bookings"
              className="block rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Bookings
            </Link>

            <div className="rounded-xl px-4 py-3 text-sm text-slate-400">
              Vendors
            </div>

            <div className="rounded-xl px-4 py-3 text-sm text-slate-400">
              Clients
            </div>

            <div className="rounded-xl px-4 py-3 text-sm text-slate-400">
              Categories
            </div>

            <div className="rounded-xl px-4 py-3 text-sm text-slate-400">
              Finance
            </div>

            <div className="rounded-xl px-4 py-3 text-sm text-slate-400">
              Disputes
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <LogoutButton />
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
              <div>
                <Link
                  href="/bookings"
                  className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                >
                  ← Back to bookings
                </Link>

                <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
                  Booking Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {text(order?.eventName)} · {id}
                </p>
              </div>

              <StatusBadge status={vendorOrder.status} />
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 md:px-8 md:py-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Booking amount"
                value={money(vendorOrder.price)}
              />

              <StatCard
                label="Down payment"
                value={money(vendorOrder.downPaymentAmount)}
              />

              <StatCard
                label="Remaining"
                value={money(
                  vendorOrder.remainingAmount ??
                    vendorOrder.price,
                )}
              />

              <StatCard
                label="Payment status"
                value={text(vendorOrder.paymentStatus)}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Event Information">
                <InfoRow
                  label="Event name"
                  value={text(order?.eventName)}
                />

                <InfoRow
                  label="Event type"
                  value={text(order?.eventType)}
                />

                <InfoRow
                  label="Event date"
                  value={formatDate(order?.eventDate)}
                />

                <InfoRow
                  label="Event time"
                  value={text(order?.eventTime)}
                />

                <InfoRow
                  label="Duration"
                  value={
                    order?.eventDuration !== undefined &&
                    order?.eventDuration !== null
                      ? String(order.eventDuration)
                      : "N/A"
                  }
                />

                <InfoRow
                  label="Guests"
                  value={
                    order?.guests !== undefined
                      ? String(order.guests)
                      : "N/A"
                  }
                />

                <InfoRow
                  label="Service / Package"
                  value={text(vendorOrder.serviceName)}
                />

                <InfoRow
                  label="Package ID"
                  value={text(vendorOrder.packageId)}
                  mono
                />
              </Card>

              <Card title="Booking Timeline">
                <InfoRow
                  label="Booking status"
                  value={text(vendorOrder.status)}
                />

                <InfoRow
                  label="Payment status"
                  value={text(vendorOrder.paymentStatus)}
                />

                <InfoRow
                  label="Event starts"
                  value={formatDateTime(
                    vendorOrder.eventStartDateTime,
                  )}
                />

                <InfoRow
                  label="Event ends"
                  value={formatDateTime(
                    vendorOrder.eventEndDateTime,
                  )}
                />

                <InfoRow
                  label="Accepted at"
                  value={formatDateTime(
                    vendorOrder.acceptedAt,
                  )}
                />

                <InfoRow
                  label="Cancelled at"
                  value={formatDateTime(
                    vendorOrder.cancelledAt,
                  )}
                />

                <InfoRow
                  label="Cancelled by"
                  value={text(vendorOrder.cancelledBy)}
                />

                <InfoRow
                  label="Cancellation reason"
                  value={text(
                    vendorOrder.cancellationReason,
                  )}
                />
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Client Information">
                <InfoRow
                  label="Name"
                  value={text(client?.name)}
                />

                <InfoRow
                  label="Email"
                  value={text(client?.email)}
                />

                <InfoRow
                  label="Phone"
                  value={clientPhone}
                />

                <InfoRow
                  label="Client ID"
                  value={text(client?._id)}
                  mono
                />
              </Card>

              <Card title="Vendor Information">
                <InfoRow
                  label="Business / Brand"
                  value={vendorName}
                />

                <InfoRow
                  label="Account name"
                  value={text(vendor?.name)}
                />

                <InfoRow
                  label="Email"
                  value={vendorEmail}
                />

                <InfoRow
                  label="Phone"
                  value={vendorPhone}
                />

                <InfoRow
                  label="City"
                  value={text(
                    vendor?.contactDetails?.city,
                  )}
                />

                <InfoRow
                  label="Vendor ID"
                  value={text(vendor?._id)}
                  mono
                />
              </Card>
            </div>

            <Card title="Payment History">
              {payments.length === 0 ? (
                <EmptyMessage message="No payment records found for this booking." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </tr>
                    </thead>

                    <tbody>
                      {payments.map((payment, index) => (
                        <tr
                          key={
                            payment._id ||
                            `payment-${index}`
                          }
                          className="border-b border-slate-100 last:border-0"
                        >
                          <TableCell>
                            <span className="font-mono text-xs">
                              {text(payment._id)}
                            </span>
                          </TableCell>

                          <TableCell>
                            {text(payment.paymentType)}
                          </TableCell>

                          <TableCell>
                            <strong>
                              {money(payment.amount)}
                            </strong>
                          </TableCell>

                          <TableCell>
                            <StatusBadge
                              status={payment.status}
                            />
                          </TableCell>

                          <TableCell>
                            {formatDateTime(
                              payment.createdAt,
                            )}
                          </TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Payout">
                {!data.payout ? (
                  <EmptyMessage message="No payout has been created for this booking." />
                ) : (
                  <>
                    <InfoRow
                      label="Status"
                      value={text(data.payout.status)}
                    />

                    <InfoRow
                      label="Gross amount"
                      value={money(
                        data.payout.grossAmount,
                      )}
                    />

                    <InfoRow
                      label="Vendor payout"
                      value={money(
                        data.payout.payoutAmount,
                      )}
                    />

                    <InfoRow
                      label="Platform commission"
                      value={money(
                        Number(
                          data.payout.grossAmount || 0,
                        ) -
                          Number(
                            data.payout.payoutAmount ||
                              0,
                          ),
                      )}
                    />

                    <InfoRow
                      label="Paid at"
                      value={formatDateTime(
                        data.payout.paidAt,
                      )}
                    />
                  </>
                )}
              </Card>

              <Card title="Refund">
                {!data.refund ? (
                  <EmptyMessage message="No refund exists for this booking." />
                ) : (
                  <>
                    <InfoRow
                      label="Status"
                      value={text(data.refund.status)}
                    />

                    <InfoRow
                      label="Amount paid"
                      value={money(
                        data.refund.amountPaid,
                      )}
                    />

                    <InfoRow
                      label="Refund amount"
                      value={money(
                        data.refund.refundAmount,
                      )}
                    />

                    <InfoRow
                      label="Withheld amount"
                      value={money(
                        data.refund.withheldAmount,
                      )}
                    />

                    <InfoRow
                      label="Paid at"
                      value={formatDateTime(
                        data.refund.paidAt,
                      )}
                    />
                  </>
                )}
              </Card>
            </div>

            <Card title="System Information">
              <InfoRow
                label="Booking ID"
                value={id}
                mono
              />

              <InfoRow
                label="Order ID"
                value={text(order?._id)}
                mono
              />

              <InfoRow
                label="Created"
                value={formatDateTime(
                  vendorOrder.createdAt,
                )}
              />

              <InfoRow
                label="Last updated"
                value={formatDateTime(
                  vendorOrder.updatedAt,
                )}
              />
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-bold">
          {title}
        </h3>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

function StatCard({
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

      <p className="mt-2 break-words text-2xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <span className="text-sm font-medium text-slate-500">
        {label}
      </span>

      <span
        className={`break-all text-sm font-semibold text-slate-900 sm:text-right ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status?: string | null;
}) {
  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass(
        status,
      )}`}
    >
      {(status || "Unknown").replaceAll(
        "_",
        " ",
      )}
    </span>
  );
}

function EmptyMessage({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
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
    <td className="px-4 py-4 text-sm text-slate-700">
      {children}
    </td>
  );
}