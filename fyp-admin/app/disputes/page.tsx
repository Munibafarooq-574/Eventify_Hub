import Link from "next/link";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

const PAGE_SIZE = 20;

const STATUSES = [
  "ALL",
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED_ORGANIZER",
  "RESOLVED_VENDOR",
  "RESOLVED_PARTIAL",
] as const;

type DisputeStatus = (typeof STATUSES)[number];

type Person = {
  _id?: string;
  name?: string;
  contactDetails?: {
    brandName?: string;
  };
};

type Dispute = {
  _id: string;
  orderId: string;
  vendorOrderId: string;
  organizerId?: Person | string | null;
  vendorId?: Person | string | null;
  raisedBy: "organizer" | "vendor";
  status: string;
  createdAt?: string;
};

type DisputesResponse = {
  disputes: Dispute[];
  total: number;
  limit: number;
  skip: number;
};

type PageProps = {
  searchParams: Promise<{
    status?: string | string[];
    page?: string | string[];
  }>;
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeStatus(value?: string): DisputeStatus {
  const status = String(value || "ALL").toUpperCase();

  return STATUSES.includes(status as DisputeStatus)
    ? (status as DisputeStatus)
    : "ALL";
}

function normalizePage(value?: string) {
  const page = Number(value || 1);

  return Number.isSafeInteger(page) && page > 0
    ? page
    : 1;
}

function disputesUrl(status: DisputeStatus, page = 1) {
  const query = new URLSearchParams();

  if (status !== "ALL") {
    query.set("status", status);
  }

  if (page > 1) {
    query.set("page", String(page));
  }

  const suffix = query.toString();

  return `/disputes${suffix ? `?${suffix}` : ""}`;
}

function readable(value?: string | null) {
  if (!value) return "—";

  if (value.toUpperCase() === "RESOLVED_ORGANIZER") {
    return "Resolved Client";
  }

  return value
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function formatDate(value?: string) {
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

function personName(
  person?: Person | string | null,
  vendor = false,
) {
  if (!person || typeof person === "string") {
    return "—";
  }

  return (
    (vendor ? person.contactDetails?.brandName : null) ||
    person.name ||
    "—"
  );
}

function statusClass(status: string) {
  switch (status) {
    case "OPEN":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "UNDER_REVIEW":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "RESOLVED_ORGANIZER":
    case "RESOLVED_VENDOR":
    case "RESOLVED_PARTIAL":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default async function DisputesPage({
  searchParams,
}: PageProps) {
  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const params = await searchParams;
  const status = normalizeStatus(first(params.status));
  const page = normalizePage(first(params.page));
  const skip = (page - 1) * PAGE_SIZE;

  const query = new URLSearchParams({
    limit: String(PAGE_SIZE),
    skip: String(skip),
  });

  if (status !== "ALL") {
    query.set("status", status);
  }

  let data: DisputesResponse | null = null;
  let errorMessage = "";

  try {
    const response = await backendFetch(
      `/admin/disputes?${query.toString()}`,
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

    if (!response.ok) {
      errorMessage = "Unable to load disputes.";
    } else {
      data = (await response.json()) as DisputesResponse;

      if (
        !data ||
        !Array.isArray(data.disputes) ||
        !Number.isFinite(data.total)
      ) {
        data = null;
        errorMessage = "Invalid response from disputes API.";
      }
    }
  } catch (error) {
    // Next.js redirects must not be swallowed by the error handler.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    errorMessage = "Unable to connect to the backend.";
  }

  const disputes = data?.disputes ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (data && page > 1 && disputes.length === 0) {
    redirect(disputesUrl(status));
  }

  const firstVisible = disputes.length ? skip + 1 : 0;
  const lastVisible = skip + disputes.length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen flex-col lg:flex-row">
           <div className="lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
          <AdminSidebar />
        </div>


        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Complaint Management
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Disputes
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Review client and vendor booking disputes.
                </p>
              </div>

              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to Dashboard
              </Link>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] space-y-6 px-5 py-6 sm:px-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Matching disputes"
                value={errorMessage ? "—" : String(total)}
              />
              <SummaryCard
                label="Current filter"
                value={readable(status)}
              />
              <SummaryCard
                label="Current page"
                value={String(page)}
              />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold">
                Filter disputes
              </h3>

              <div className="mt-4 flex flex-wrap gap-2">
                {STATUSES.map((item) => (
                  <Link
                    key={item}
                    href={disputesUrl(item)}
                    className={
                      status === item
                        ? "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    }
                  >
                    {readable(item)}
                  </Link>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-5">
                <h3 className="text-lg font-bold">
                  Dispute records
                </h3>

                {!errorMessage && (
                  <p className="mt-1 text-sm text-slate-500">
                    Showing {firstVisible}–{lastVisible} of {total}
                  </p>
                )}
              </div>

              {errorMessage ? (
                <div
                  role="alert"
                  className="px-6 py-14 text-center"
                >
                  <p className="font-semibold text-red-700">
                    {errorMessage}
                  </p>

                  <Link
                    href={disputesUrl(status, page)}
                    className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Try again
                  </Link>
                </div>
              ) : disputes.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <p className="font-semibold">
                    No disputes found
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    No records match the selected filter.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        {[
                          "Dispute",
                          "Booking reference",
                          "Client",
                          "Vendor",
                          "Raised by",
                          "Status",
                          "Created",
                          "Action",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {disputes.map((dispute) => (
                        <tr
                          key={dispute._id}
                          className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4 font-mono text-xs text-slate-600">
                            {dispute._id}
                          </td>

                          <td className="px-5 py-4">
                            <Link
                              href={`/bookings/${dispute.vendorOrderId}`}
                              className="font-mono text-xs font-semibold text-blue-700 hover:underline"
                            >
                              {dispute.vendorOrderId}
                            </Link>
                            <p className="mt-1 font-mono text-xs text-slate-400">
                              Order: {dispute.orderId}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm font-medium">
                            {personName(dispute.organizerId)}
                          </td>

                          <td className="px-5 py-4 text-sm font-medium">
                            {personName(dispute.vendorId, true)}
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {readable(dispute.raisedBy)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(dispute.status)}`}
                            >
                              {readable(dispute.status)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDate(dispute.createdAt)}
                          </td>

                          <td className="px-5 py-4">
                            <Link
                              href={`/disputes/${dispute._id}`}
                              className="inline-flex whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                            >
                              View details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!errorMessage && total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/50 px-5 py-4">
                  <p className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </p>

                  <div className="flex items-center gap-2">
                    {page > 1 ? (
                      <Link
                        href={disputesUrl(status, page - 1)}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
                      >
                        ← Previous
                      </Link>
                    ) : (
                      <span className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-400">
                        ← Previous
                      </span>
                    )}

                    {page < totalPages ? (
                      <Link
                        href={disputesUrl(status, page + 1)}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
                      >
                        Next →
                      </Link>
                    ) : (
                      <span className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-400">
                        Next →
                      </span>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
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
      <p className="mt-3 break-words text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}