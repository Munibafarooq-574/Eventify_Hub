import Link from "next/link";
import { redirect } from "next/navigation";

import AdminSidebar from "@/components/AdminSidebar";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

const PAGE_SIZE = 20;

const STATUSES = [
  "all",
  "visible",
  "pending",
  "hidden",
  "rejected",
] as const;

type ReviewStatus = (typeof STATUSES)[number];

type ReviewPerson = {
  _id?: string;
  name?: string;
  email?: string;
  contactDetails?: {
    brandName?: string;
  };
};

type ReviewMedia = {
  url?: string;
  type?: "IMAGE" | "VIDEO" | "image" | "video";
};

type ReviewRow = {
  _id: string;
  userId?: ReviewPerson | string | null;
  vendorId?: ReviewPerson | string | null;
  reviewerName?: string;
  rating: number;
  reviewText: string;
  media?: ReviewMedia[];
  status?: "visible" | "pending" | "hidden" | "rejected";
  moderationReason?: string;
  createdAt?: string;
};

type ReviewsResponse = {
  reviews: ReviewRow[];
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

function normalizeStatus(value?: string): ReviewStatus {
  const status = String(value || "all").toLowerCase();

  return STATUSES.includes(status as ReviewStatus)
    ? (status as ReviewStatus)
    : "all";
}

function normalizePage(value?: string) {
  const page = Number(value || 1);

  return Number.isSafeInteger(page) && page > 0
    ? page
    : 1;
}

function reviewsUrl(
  status: ReviewStatus,
  page = 1,
) {
  const query = new URLSearchParams();

  if (status !== "all") {
    query.set("status", status);
  }

  if (page > 1) {
    query.set("page", String(page));
  }

  const suffix = query.toString();

  return `/reviews${suffix ? `?${suffix}` : ""}`;
}

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function personName(
  person?: ReviewPerson | string | null,
  vendor = false,
) {
  if (!person) {
    return "—";
  }

  if (typeof person === "string") {
    return person;
  }

  return (
    (vendor
      ? person.contactDetails?.brandName
      : null) ||
    person.name ||
    "—"
  );
}

function personEmail(
  person?: ReviewPerson | string | null,
) {
  if (!person || typeof person === "string") {
    return "";
  }

  return person.email || "";
}

function effectiveStatus(review: ReviewRow) {
  // Legacy reviews created before moderation existed
  // are treated by the backend as visible.
  return review.status || "visible";
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pending";
    case "hidden":
      return "Hidden";
    case "rejected":
      return "Rejected";
    default:
      return "Visible";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "hidden":
      return "border-slate-300 bg-slate-100 text-slate-700";

    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";

    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function ratingStars(rating: number) {
  const safeRating = Math.max(
    0,
    Math.min(5, Number(rating || 0)),
  );

  return `${"★".repeat(safeRating)}${"☆".repeat(
    5 - safeRating,
  )}`;
}

export default async function ReviewsPage({
  searchParams,
}: PageProps) {
  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const params = await searchParams;

  const status = normalizeStatus(
    first(params.status),
  );

  const page = normalizePage(
    first(params.page),
  );

  const skip = (page - 1) * PAGE_SIZE;

  const query = new URLSearchParams({
    limit: String(PAGE_SIZE),
    skip: String(skip),
  });

  if (status !== "all") {
    query.set("status", status);
  }

  let data: ReviewsResponse | null = null;
  let errorMessage = "";

  try {
    const response = await backendFetch(
      `/admin/reviews?${query.toString()}`,
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
      errorMessage =
        "Unable to load reviews.";
    } else {
      const payload =
        (await response.json()) as ReviewsResponse;

      if (
        !payload ||
        !Array.isArray(payload.reviews) ||
        !Number.isFinite(payload.total)
      ) {
        errorMessage =
          "Invalid response from reviews API.";
      } else {
        data = payload;
      }
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String(error.digest).startsWith(
        "NEXT_REDIRECT",
      )
    ) {
      throw error;
    }

    errorMessage =
      "Unable to connect to the backend.";
  }

  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;

  const totalPages =
    total > 0
      ? Math.ceil(total / PAGE_SIZE)
      : 0;

  if (
    data &&
    page > 1 &&
    reviews.length === 0
  ) {
    redirect(reviewsUrl(status, 1));
  }

  const firstVisible =
    reviews.length > 0 ? skip + 1 : 0;

  const lastVisible =
    skip + reviews.length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <div className="lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
          <AdminSidebar />
        </div>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
            <div className="mx-auto max-w-[1500px]">
              <p className="text-sm font-medium text-slate-500">
                Management
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                Reviews
              </h1>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Review Moderation
              </h2>

              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                View Client reviews, Vendor
                information, ratings, media and
                moderation status.
              </p>
            </div>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total Reviews
                </p>

                <p className="mt-3 text-2xl font-bold">
                  {total}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Showing
                </p>

                <p className="mt-3 text-2xl font-bold">
                  {reviews.length === 0
                    ? "0"
                    : `${firstVisible}-${lastVisible}`}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current Filter
                </p>

                <p className="mt-3 text-2xl font-bold capitalize">
                  {status === "all"
                    ? "All"
                    : statusLabel(status)}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <form
                method="GET"
                action="/reviews"
                className="flex flex-col gap-4 sm:flex-row sm:items-end"
              >
                <div className="w-full sm:max-w-xs">
                  <label
                    htmlFor="status"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Moderation Status
                  </label>

                  <select
                    id="status"
                    name="status"
                    defaultValue={status}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  >
                    <option value="all">
                      All Reviews
                    </option>

                    <option value="visible">
                      Visible
                    </option>

                    <option value="pending">
                      Pending
                    </option>

                    <option value="hidden">
                      Hidden
                    </option>

                    <option value="rejected">
                      Rejected
                    </option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Apply Filter
                </button>

                {status !== "all" ? (
                  <Link
                    href="/reviews"
                    className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Reset
                  </Link>
                ) : null}
              </form>
            </section>

            {errorMessage ? (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
                <h3 className="font-semibold text-rose-800">
                  Reviews could not be loaded
                </h3>

                <p className="mt-2 text-sm text-rose-700">
                  {errorMessage}
                </p>

                <Link
                  href={reviewsUrl(status, page)}
                  className="mt-4 inline-flex rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Try again
                </Link>
              </section>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold">
                        Customer Reviews
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Page {page}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {reviews.length} shown
                    </span>
                  </div>
                </div>

                {reviews.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <p className="text-lg font-semibold">
                      No reviews found
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      There are no reviews matching
                      the selected moderation status.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1350px] text-left">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-4">
                            Client
                          </th>

                          <th className="px-5 py-4">
                            Vendor
                          </th>

                          <th className="px-5 py-4">
                            Rating
                          </th>

                          <th className="px-5 py-4">
                            Review
                          </th>

                          <th className="px-5 py-4">
                            Media
                          </th>

                          <th className="px-5 py-4">
                            Status
                          </th>

                          <th className="px-5 py-4">
                            Review Date
                          </th>

                          <th className="px-5 py-4 text-right">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {reviews.map((review) => {
                          const currentStatus =
                            effectiveStatus(review);

                          const media =
                            Array.isArray(review.media)
                              ? review.media
                              : [];

                          return (
                            <tr
                              key={review._id}
                              className="align-top transition hover:bg-slate-50/80"
                            >
                              <td className="px-5 py-5">
                                <p className="max-w-[180px] truncate text-sm font-semibold">
                                  {personName(
                                    review.userId,
                                  ) ||
                                    review.reviewerName ||
                                    "—"}
                                </p>

                                {personEmail(
                                  review.userId,
                                ) ? (
                                  <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                                    {personEmail(
                                      review.userId,
                                    )}
                                  </p>
                                ) : null}
                              </td>

                              <td className="px-5 py-5">
                                <p className="max-w-[190px] truncate text-sm font-semibold">
                                  {personName(
                                    review.vendorId,
                                    true,
                                  )}
                                </p>

                                {personEmail(
                                  review.vendorId,
                                ) ? (
                                  <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                                    {personEmail(
                                      review.vendorId,
                                    )}
                                  </p>
                                ) : null}
                              </td>

                              <td className="px-5 py-5">
                                <p className="whitespace-nowrap text-base font-semibold text-amber-500">
                                  {ratingStars(
                                    review.rating,
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {review.rating}/5
                                </p>
                              </td>

                              <td className="px-5 py-5">
                                <p className="max-w-[320px] whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                                  {review.reviewText ||
                                    "—"}
                                </p>

                                {review.moderationReason ? (
                                  <p className="mt-2 max-w-[320px] text-xs text-slate-400">
                                    Moderation reason:{" "}
                                    {
                                      review.moderationReason
                                    }
                                  </p>
                                ) : null}
                              </td>

                              <td className="px-5 py-5">
                                {media.length === 0 ? (
                                  <span className="text-sm text-slate-400">
                                    No media
                                  </span>
                                ) : (
                                  <div className="flex max-w-[220px] flex-wrap gap-2">
                                    {media.map(
                                      (
                                        item,
                                        index,
                                      ) => {
                                        if (!item.url) {
                                          return null;
                                        }

                                        const isVideo =
                                          String(
                                            item.type ||
                                              "",
                                          ).toLowerCase() ===
                                          "video";

                                        return (
                                          <a
                                            key={`${review._id}-${index}`}
                                            href={
                                              item.url
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                          >
                                            {isVideo
                                              ? `Video ${index + 1}`
                                              : `Image ${index + 1}`}
                                          </a>
                                        );
                                      },
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="px-5 py-5">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                    currentStatus,
                                  )}`}
                                >
                                  {statusLabel(
                                    currentStatus,
                                  )}
                                </span>
                              </td>

                              <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-600">
                                {formatDate(
                                  review.createdAt,
                                )}
                              </td>

                              <td className="px-5 py-5 text-right">
                                <Link
                                  href={`/reviews/${encodeURIComponent(
                                    review._id,
                                  )}`}
                                  className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                >
                                  View & Moderate
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Page {page}
                      {totalPages > 0
                        ? ` of ${totalPages}`
                        : ""}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {total} review
                      {total === 1 ? "" : "s"} total
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {page > 1 ? (
                      <Link
                        href={reviewsUrl(
                          status,
                          page - 1,
                        )}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Previous
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-300">
                        Previous
                      </span>
                    )}

                    {page * PAGE_SIZE <
                    total ? (
                      <Link
                        href={reviewsUrl(
                          status,
                          page + 1,
                        )}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Next
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
                        Next
                      </span>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}