// fyp-admin/app/campaigns/page.tsx

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import CampaignModerationActions from "@/components/CampaignModerationActions";
import LogoutButton from "@/components/LogoutButton";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type CampaignStatus =
  | "draft"
  | "pending"
  | "approved"
  | "active"
  | "rejected"
  | "expired"
  | "cancelled";

type CampaignVendor = {
  _id?: string;
  id?: string;
  name?: string | null;
  email?: string | null;
};

type CampaignCategory = {
  _id?: string;
  id?: string;
  name?: string | null;
};

type ReviewedBy = {
  _id?: string;
  id?: string;
  name?: string | null;
  email?: string | null;
};

type Campaign = {
  _id: string;

  vendorId?: CampaignVendor | string | null;
  packageId?: string | null;
  categoryId?: CampaignCategory | string | null;

  title?: string | null;
  image?: string | null;
  description?: string | null;
  offerLabel?: string | null;

  startDate?: string | null;
  endDate?: string | null;

  status: CampaignStatus | string;

  rejectionReason?: string | null;

  reviewedBy?: ReviewedBy | string | null;
  reviewedAt?: string | null;

  cancelledAt?: string | null;
  cancelledReason?: string | null;

  impressions?: number;
  clicks?: number;
  packageVisits?: number;

  createdAt?: string | null;
  updatedAt?: string | null;
};

type SearchParams = {
  status?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "APPROVED",
  "ACTIVE",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
];

const sidebarItemClass = (active = false) =>
  `flex items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
    active
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

const prettyText = (value?: string | null) => {
  if (!value) return "N/A";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

const statusClass = (status?: string) => {
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "approved":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";

    case "cancelled":
      return "border-slate-300 bg-slate-100 text-slate-600";

    case "expired":
      return "border-zinc-200 bg-zinc-50 text-zinc-600";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
};

const getVendor = (
  vendorId?: CampaignVendor | string | null,
): CampaignVendor | null => {
  if (!vendorId || typeof vendorId === "string") {
    return null;
  }

  return vendorId;
};

const getCategoryName = (
  categoryId?: CampaignCategory | string | null,
) => {
  if (!categoryId || typeof categoryId === "string") {
    return "N/A";
  }

  return categoryId.name || "N/A";
};

const getReviewer = (
  reviewedBy?: ReviewedBy | string | null,
): ReviewedBy | null => {
  if (!reviewedBy || typeof reviewedBy === "string") {
    return null;
  }

  return reviewedBy;
};

export default async function CampaignsPage({
  searchParams,
}: PageProps) {
  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const params = searchParams
    ? await searchParams
    : {};

  const selectedStatus =
    typeof params.status === "string"
      ? params.status.toUpperCase()
      : "ALL";

  const query = new URLSearchParams();

  query.set("limit", "100");
  query.set("skip", "0");

  if (selectedStatus !== "ALL") {
    query.set(
      "status",
      selectedStatus.toLowerCase(),
    );
  }

  const response = await backendFetch(
    `/admin/campaigns?${query.toString()}`,
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
    throw new Error(
      "Unable to load vendor campaigns.",
    );
  }

  const result = (await response.json()) as unknown;

  // Current backend getCampaigns() returns an array.
  // This also keeps the page compatible if pagination is wrapped later.
  const campaigns: Campaign[] = Array.isArray(result)
    ? (result as Campaign[])
    : result &&
        typeof result === "object" &&
        "items" in result &&
        Array.isArray(
          (result as { items?: unknown }).items,
        )
      ? ((result as { items: Campaign[] }).items)
      : [];

  const pendingCount = campaigns.filter(
    (campaign) =>
      String(campaign.status).toLowerCase() ===
      "pending",
  ).length;

  const activeCount = campaigns.filter(
    (campaign) =>
      String(campaign.status).toLowerCase() ===
      "active",
  ).length;

  const approvedCount = campaigns.filter(
    (campaign) =>
      String(campaign.status).toLowerCase() ===
      "approved",
  ).length;

  const filterHref = (status: string) =>
    status === "ALL"
      ? "/campaigns"
      : `/campaigns?status=${status.toLowerCase()}`;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}

        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Eventify Hub
            </p>

            <h1 className="mt-2 text-xl font-bold text-slate-900">
              Admin Console
            </h1>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-5">
            <Link
              href="/dashboard"
              className={sidebarItemClass()}
            >
              Dashboard
            </Link>

            <Link
              href="/bookings"
              className={sidebarItemClass()}
            >
              Bookings
            </Link>

            <Link
              href="/vendors"
              className={sidebarItemClass()}
            >
              Vendors
            </Link>

            <Link
              href="/clients"
              className={sidebarItemClass()}
            >
              Clients
            </Link>

            <Link
              href="/categories"
              className={sidebarItemClass()}
            >
              Categories
            </Link>

            <div className="px-4 pb-1 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Marketing
              </p>
            </div>

            <Link
              href="/campaigns"
              className={sidebarItemClass(true)}
            >
              Campaigns
            </Link>

            <div className="px-4 pb-1 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Finance
              </p>
            </div>

            <Link
              href="/payments"
              className={sidebarItemClass()}
            >
              Booking Payments
            </Link>

            <Link
              href="/refunds"
              className={sidebarItemClass()}
            >
              Refunds
            </Link>

            <Link
              href="/subscriptions"
              className={sidebarItemClass()}
            >
              Subscription Payments
            </Link>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <LogoutButton />
          </div>
        </aside>

        {/* CONTENT */}

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8 lg:px-10">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Marketing
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Campaign Management
                </h2>
              </div>

              <div className="lg:hidden">
                <LogoutButton />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] space-y-6 px-5 py-7 sm:px-8 lg:px-10">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Vendor Advertising Campaigns
              </h3>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Review vendor campaign submissions before
                they are allowed to run in Eventify Hub.
                Approve valid advertisements or reject them
                with a clear reason.
              </p>
            </div>

            {/* KPI CARDS */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Loaded Campaigns
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {campaigns.length}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Pending Review
                </p>

                <p className="mt-2 text-3xl font-bold text-amber-700">
                  {pendingCount}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Admin action required
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Approved
                </p>

                <p className="mt-2 text-3xl font-bold text-blue-700">
                  {approvedCount}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Waiting for scheduled start
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Active
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-700">
                  {activeCount}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Currently running
                </p>
              </div>
            </div>

            {/* FILTERS */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Campaign Status
              </p>

              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((filter) => (
                  <Link
                    key={filter}
                    href={filterHref(filter)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      selectedStatus === filter
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {prettyText(filter)}
                  </Link>
                ))}
              </div>
            </div>

            {/* CAMPAIGN LIST */}

            {campaigns.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-xl">
                  📣
                </div>

                <h4 className="mt-4 font-semibold">
                  No campaigns found
                </h4>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Campaigns matching the selected status
                  will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => {
                  const vendor = getVendor(
                    campaign.vendorId,
                  );

                  const reviewer = getReviewer(
                    campaign.reviewedBy,
                  );

                  return (
                    <article
                      key={campaign._id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)_260px]">
                        {/* IMAGE */}

                        <div className="relative min-h-[210px] bg-slate-100">
                          {campaign.image ? (
                            <Image
                              src={campaign.image}
                              alt={
                                campaign.title ||
                                "Campaign"
                              }
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full min-h-[210px] items-center justify-center text-sm text-slate-400">
                              No campaign image
                            </div>
                          )}
                        </div>

                        {/* DETAILS */}

                        <div className="p-5 sm:p-6">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-bold text-slate-900">
                                  {campaign.title ||
                                    "Untitled Campaign"}
                                </h4>

                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                                    campaign.status,
                                  )}`}
                                >
                                  {prettyText(
                                    campaign.status,
                                  )}
                                </span>
                              </div>

                              {campaign.offerLabel ? (
                                <p className="mt-2 inline-flex rounded-lg bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                  {campaign.offerLabel}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                            {campaign.description ||
                              "No campaign description provided."}
                          </p>

                          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Vendor
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-800">
                                {vendor?.name ||
                                  "Unknown Vendor"}
                              </p>

                              <p className="mt-1 break-all text-xs text-slate-500">
                                {vendor?.email ||
                                  "No email"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Category
                              </p>

                              <p className="mt-1 text-sm font-medium text-slate-700">
                                {getCategoryName(
                                  campaign.categoryId,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Start
                              </p>

                              <p className="mt-1 text-sm text-slate-700">
                                {formatDate(
                                  campaign.startDate,
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                End
                              </p>

                              <p className="mt-1 text-sm text-slate-700">
                                {formatDate(
                                  campaign.endDate,
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                            <span>
                              Package ID:{" "}
                              <code className="text-slate-700">
                                {campaign.packageId ||
                                  "N/A"}
                              </code>
                            </span>

                            <span>
                              Submitted:{" "}
                              {formatDateTime(
                                campaign.createdAt,
                              )}
                            </span>
                          </div>

                          {campaign.rejectionReason ? (
                            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                              <p className="text-xs font-semibold text-red-800">
                                Rejection Reason
                              </p>

                              <p className="mt-1 text-xs leading-5 text-red-700">
                                {
                                  campaign.rejectionReason
                                }
                              </p>
                            </div>
                          ) : null}

                          {campaign.cancelledReason ? (
                            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold text-slate-700">
                                Cancellation Reason
                              </p>

                              <p className="mt-1 text-xs leading-5 text-slate-600">
                                {
                                  campaign.cancelledReason
                                }
                              </p>
                            </div>
                          ) : null}

                          {campaign.reviewedAt ? (
                            <p className="mt-4 text-xs text-slate-400">
                              Reviewed{" "}
                              {formatDateTime(
                                campaign.reviewedAt,
                              )}
                              {reviewer
                                ? ` by ${
                                    reviewer.name ||
                                    reviewer.email ||
                                    "Admin"
                                  }`
                                : ""}
                            </p>
                          ) : null}
                        </div>

                        {/* MODERATION */}

                        <div className="border-t border-slate-200 bg-slate-50/60 p-5 lg:border-l lg:border-t-0">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Moderation
                          </p>

                          <div className="mt-4">
                            <CampaignModerationActions
                              campaignId={
                                campaign._id
                              }
                              status={
                                campaign.status
                              }
                            />
                          </div>

                          <div className="mt-6 border-t border-slate-200 pt-4">
                            <p className="text-xs font-semibold text-slate-500">
                              Analytics
                            </p>

                            <div className="mt-3 space-y-2 text-xs text-slate-600">
                              <div className="flex justify-between">
                                <span>Impressions</span>
                                <strong>
                                  {Number(
                                    campaign.impressions ||
                                      0,
                                  ).toLocaleString()}
                                </strong>
                              </div>

                              <div className="flex justify-between">
                                <span>Clicks</span>
                                <strong>
                                  {Number(
                                    campaign.clicks ||
                                      0,
                                  ).toLocaleString()}
                                </strong>
                              </div>

                              <div className="flex justify-between">
                                <span>
                                  Package Visits
                                </span>
                                <strong>
                                  {Number(
                                    campaign.packageVisits ||
                                      0,
                                  ).toLocaleString()}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}