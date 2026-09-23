import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AdminSidebar from "@/components/AdminSidebar";
import ReviewModerationActions from "@/components/ReviewModerationActions";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type Person = {
  _id?: string;
  name?: string;
  email?: string;
  contactDetails?: {
    brandName?: string;
    phoneNumber?: string;
  };
};

type ReviewMedia = {
  type?: "image" | "video" | "IMAGE" | "VIDEO";
  url?: string;
};

type ModerationHistoryItem = {
  status?: string;
  reason?: string;
  moderatedAt?: string;
  moderatedBy?: string | Person | null;
};

type Review = {
  _id: string;
  userId?: Person | string | null;
  vendorId?: Person | string | null;
  reviewerName?: string;
  rating?: number;
  reviewText?: string;
  media?: ReviewMedia[];
  vendorReply?: string;
  status?: "visible" | "pending" | "hidden" | "rejected";
  moderationReason?: string;
  moderatedAt?: string;
  moderatedBy?: string | Person | null;
  moderationHistory?: ModerationHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
};

type ReviewDetailResponse = {
  review: Review;
  booking: unknown | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value?: string) {
  if (!value) return "—";

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
  person?: Person | string | null,
  vendor = false,
) {
  if (!person) return "—";

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
  person?: Person | string | null,
) {
  if (!person || typeof person === "string") {
    return "—";
  }

  return person.email || "—";
}

function moderatorName(
  person?: Person | string | null,
) {
  if (!person) return "—";

  if (typeof person === "string") {
    return person;
  }

  return person.name || person.email || "—";
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

function ratingStars(rating?: number) {
  const safeRating = Math.max(
    0,
    Math.min(
      5,
      Math.round(Number(rating || 0)),
    ),
  );

  return `${"★".repeat(
    safeRating,
  )}${"☆".repeat(5 - safeRating)}`;
}

export default async function ReviewDetailPage({
  params,
}: PageProps) {
  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const { id } = await params;

  const response = await backendFetch(
    `/admin/reviews/${encodeURIComponent(id)}`,
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

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(
      "Unable to load review details.",
    );
  }

  const data =
    (await response.json()) as ReviewDetailResponse;

  if (!data?.review?._id) {
    throw new Error(
      "Invalid review detail response.",
    );
  }

  const review = data.review;

  // Legacy reviews without status are visible.
  const currentStatus =
    review.status || "visible";

  const media = Array.isArray(review.media)
    ? review.media.filter(
        (item) => Boolean(item?.url),
      )
    : [];

  const history = Array.isArray(
    review.moderationHistory,
  )
    ? review.moderationHistory
    : [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <div className="lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
          <AdminSidebar />
        </div>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
            <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Management / Reviews
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight">
                  Review Details
                </h1>
              </div>

              <Link
                href="/reviews"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Reviews
              </Link>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Review
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="text-xl font-bold text-amber-500">
                      {ratingStars(
                        review.rating,
                      )}
                    </p>

                    <span className="text-sm font-semibold text-slate-600">
                      {Number(
                        review.rating || 0,
                      )}
                      /5
                    </span>
                  </div>

                  <p className="mt-4 max-w-4xl whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                    {review.reviewText ||
                      "No review text."}
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(
                    currentStatus,
                  )}`}
                >
                  {statusLabel(
                    currentStatus,
                  )}
                </span>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">
                  Client
                </h2>

                <dl className="mt-5 space-y-4">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Name
                    </dt>

                    <dd className="mt-1 text-sm font-semibold">
                      {personName(
                        review.userId,
                      ) !== "—"
                        ? personName(
                            review.userId,
                          )
                        : review.reviewerName ||
                          "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Email
                    </dt>

                    <dd className="mt-1 text-sm">
                      {personEmail(
                        review.userId,
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">
                  Vendor
                </h2>

                <dl className="mt-5 space-y-4">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Vendor
                    </dt>

                    <dd className="mt-1 text-sm font-semibold">
                      {personName(
                        review.vendorId,
                        true,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Email
                    </dt>

                    <dd className="mt-1 text-sm">
                      {personEmail(
                        review.vendorId,
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    Review Media
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Media originally submitted with
                    this review.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {media.length} item
                  {media.length === 1
                    ? ""
                    : "s"}
                </span>
              </div>

              {media.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                  No media attached to this review.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {media.map(
                    (item, index) => {
                      const url =
                        item.url as string;

                      const isVideo =
                        String(
                          item.type || "",
                        ).toLowerCase() ===
                        "video";

                      return (
                        <div
                          key={`${url}-${index}`}
                          className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                        >
                          {isVideo ? (
                            <video
                              src={url}
                              controls
                              preload="metadata"
                              className="aspect-video w-full bg-black object-contain"
                            >
                              Your browser does not
                              support video.
                            </video>
                          ) : (
                            // Native img avoids requiring
                            // every S3 media host in Next Image config.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={`Review media ${index + 1}`}
                              className="aspect-video w-full object-cover"
                            />
                          )}

                          <div className="p-3">
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-slate-700 underline underline-offset-2"
                            >
                              Open{" "}
                              {isVideo
                                ? "video"
                                : "image"}
                            </a>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </section>

            {review.vendorReply ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">
                  Vendor Reply
                </h2>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {review.vendorReply}
                </p>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">
                Moderation
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Current Status
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {statusLabel(
                      currentStatus,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Review Date
                  </p>

                  <p className="mt-1 text-sm">
                    {formatDate(
                      review.createdAt,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Last Moderated
                  </p>

                  <p className="mt-1 text-sm">
                    {formatDate(
                      review.moderatedAt,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Moderated By
                  </p>

                  <p className="mt-1 break-all text-sm">
                    {moderatorName(
                      review.moderatedBy,
                    )}
                  </p>
                </div>
              </div>

              {review.moderationReason ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Latest Reason
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {review.moderationReason}
                  </p>
                </div>
              ) : null}

              <div className="mt-6 border-t border-slate-200 pt-6">
                <ReviewModerationActions
                  reviewId={review._id}
                  status={currentStatus}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">
                Moderation History
              </h2>

              {history.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No moderation history recorded.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {history.map(
                    (entry, index) => (
                      <div
                        key={`${entry.moderatedAt || "history"}-${index}`}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                              entry.status ||
                                "visible",
                            )}`}
                          >
                            {statusLabel(
                              entry.status ||
                                "visible",
                            )}
                          </span>

                          <span className="text-xs text-slate-500">
                            {formatDate(
                              entry.moderatedAt,
                            )}
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                          Admin:{" "}
                          {moderatorName(
                            entry.moderatedBy,
                          )}
                        </p>

                        {entry.reason ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                            {entry.reason}
                          </p>
                        ) : null}
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}