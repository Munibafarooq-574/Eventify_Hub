import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import LogoutButton from "@/components/LogoutButton";
import DisputeResolutionForm from "@/components/DisputeResolutionForm";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type Person = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  contactDetails?: {
    brandName?: string;
  };
};

type Dispute = {
  _id: string;
  vendorOrderId: string;
  orderId: string;
  organizerId?: Person | null;
  vendorId?: Person | null;
  raisedBy: string;
  organizerStatement?: string | null;
  vendorStatement?: string | null;
  evidenceUrls?: string[];
  status: string;
  resolutionNotes?: string | null;
  partialRefundAmount?: number | null;
  resolvedAt?: string | null;
  createdAt?: string;
};

type VendorOrder = {
  _id?: string;
  serviceName?: string;
  price?: number;
  status?: string;
  paymentStatus?: string;
};

type Payment = {
  _id?: string;
  amount?: number;
  status?: string;
  createdAt?: string;
};

type Refund = {
  status?: string;
  refundAmount?: number;
};

type DetailResponse = {
  dispute: Dispute;
  vendorOrder?: VendorOrder | null;
  timeline?: {
    acceptedAt?: string | null;
    cancelledAt?: string | null;
    cancellationReason?: string | null;
  };
  payments?: Payment[];
  refund?: Refund | null;
};

function readable(value?: string | null) {
  if (!value) return "—";

  return value
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function money(value?: number | null) {
  return `Rs ${Number(value || 0).toLocaleString("en-PK")}`;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900">
        {value || "—"}
      </p>
    </div>
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
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default async function DisputeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    notFound();
  }

  let data: DetailResponse | null = null;
  let errorMessage = "";

  try {
    const response = await backendFetch(
      `/admin/disputes/${encodeURIComponent(id)}`,
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
      errorMessage = "Unable to load dispute details.";
    } else {
      data = (await response.json()) as DetailResponse;

      if (!data?.dispute) {
        data = null;
        errorMessage = "Invalid dispute details response.";
      }
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      (String(error.digest).startsWith("NEXT_REDIRECT") ||
        String(error.digest).startsWith("NEXT_HTTP_ERROR_FALLBACK"))
    ) {
      throw error;
    }

    errorMessage = "Unable to connect to the backend.";
  }

  const dispute = data?.dispute;
  const vendorOrder = data?.vendorOrder;
  const payments = data?.payments ?? [];

  const amountPaid = payments
    .filter((payment) => payment.status === "SUCCESS")
    .reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

  const resolved =
    dispute?.status === "RESOLVED_ORGANIZER" ||
    dispute?.status === "RESOLVED_VENDOR" ||
    dispute?.status === "RESOLVED_PARTIAL";

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
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Dashboard
            </Link>
            <Link
              href="/bookings"
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Bookings
            </Link>
            <Link
              href="/disputes"
              className="block rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Disputes
            </Link>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <LogoutButton />
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-5 py-6 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
              <Link
                href="/disputes"
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                ← Back to disputes
              </Link>

              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Dispute Details
              </h2>

              <p className="mt-2 break-all font-mono text-xs text-slate-500">
                {id}
              </p>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-6 sm:px-8">
            {errorMessage ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-white p-8 text-center"
              >
                <p className="font-semibold text-red-700">
                  {errorMessage}
                </p>
                <Link
                  href={`/disputes/${id}`}
                  className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Try again
                </Link>
              </div>
            ) : dispute ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">Status</p>
                    <p className="mt-2 font-bold">
                      {readable(dispute.status)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">Raised by</p>
                    <p className="mt-2 font-bold">
                      {readable(dispute.raisedBy)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">Created</p>
                    <p className="mt-2 font-bold">
                      {formatDate(dispute.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <Card title="Booking Information">
                    <InfoRow
                      label="Booking reference"
                      value={dispute.vendorOrderId}
                    />
                    <InfoRow
                      label="Order reference"
                      value={dispute.orderId}
                    />
                    <InfoRow
                      label="Service"
                      value={vendorOrder?.serviceName}
                    />
                    <InfoRow
                      label="Booking amount"
                      value={money(vendorOrder?.price)}
                    />
                    <InfoRow
                      label="Booking status"
                      value={readable(vendorOrder?.status)}
                    />
                    <InfoRow
                      label="Payment status"
                      value={readable(vendorOrder?.paymentStatus)}
                    />
                    <Link
                      href={`/bookings/${dispute.vendorOrderId}`}
                      className="mt-4 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      View booking
                    </Link>
                  </Card>

                  <Card title="Parties">
                    <InfoRow
                      label="Client"
                      value={dispute.organizerId?.name}
                    />
                    <InfoRow
                      label="Client email"
                      value={dispute.organizerId?.email}
                    />
                    <InfoRow
                      label="Vendor"
                      value={
                        dispute.vendorId?.contactDetails?.brandName ||
                        dispute.vendorId?.name
                      }
                    />
                    <InfoRow
                      label="Vendor email"
                      value={dispute.vendorId?.email}
                    />
                  </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <Card title="Client Statement">
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
                      {dispute.organizerStatement || "No statement provided."}
                    </p>
                  </Card>

                  <Card title="Vendor Statement">
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
                      {dispute.vendorStatement || "No statement provided."}
                    </p>
                  </Card>
                </div>

                <Card title="Complaint Evidence">
                  {dispute.evidenceUrls?.length ? (
                    <div className="space-y-3">
                      {dispute.evidenceUrls.map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <p className="text-sm font-semibold">
                            Evidence {index + 1}
                          </p>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block break-all text-sm text-blue-700 underline"
                          >
                            Open evidence
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No evidence attached.
                    </p>
                  )}
                </Card>

                <div className="grid gap-6 xl:grid-cols-2">
                  <Card title="Booking Timeline">
                    <InfoRow
                      label="Accepted"
                      value={formatDate(data?.timeline?.acceptedAt)}
                    />
                    <InfoRow
                      label="Cancelled"
                      value={formatDate(data?.timeline?.cancelledAt)}
                    />
                    <InfoRow
                      label="Cancellation reason"
                      value={data?.timeline?.cancellationReason}
                    />
                  </Card>

                  <Card title="Payment & Refund">
                    <InfoRow
                      label="Successful payments"
                      value={money(amountPaid)}
                    />
                    <InfoRow
                      label="Refund status"
                      value={readable(data?.refund?.status)}
                    />
                    <InfoRow
                      label="Refund amount"
                      value={
                        data?.refund
                          ? money(data.refund.refundAmount)
                          : "—"
                      }
                    />
                  </Card>
                </div>

                <Card title="Admin Resolution">
                  {resolved ? (
                    <>
                      <InfoRow
                        label="Final decision"
                        value={readable(dispute.status)}
                      />
                      <InfoRow
                        label="Resolution notes"
                        value={dispute.resolutionNotes}
                      />
                      {dispute.status === "RESOLVED_PARTIAL" && (
                        <InfoRow
                          label="Partial refund"
                          value={money(dispute.partialRefundAmount)}
                        />
                      )}
                      <InfoRow
                        label="Resolved at"
                        value={formatDate(dispute.resolvedAt)}
                      />
                    </>
                  ) : (
                    <DisputeResolutionForm
                      disputeId={dispute._id}
                      amountPaid={amountPaid}
                    />
                  )}
                </Card>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}