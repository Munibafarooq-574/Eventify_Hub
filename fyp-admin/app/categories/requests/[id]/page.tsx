import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import {
  getAdminToken,
} from "@/lib/auth";

import {
  backendFetch,
} from "@/lib/backend";

import CategoryRequestReviewForm from "@/components/CategoryRequestReviewForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Category = {
  _id: string;
  name: string;
  description?: string;
  businessDetailsType?: string;
  isActive?: boolean;
};

type CategoryRequest = {
  _id: string;

  requesterName?: string;
  requesterEmail?: string;

  requestedName: string;
  normalizedName?: string;
  description?: string;

  status: string;

  requestedBy?: {
    _id?: string;
    name?: string;
    email?: string;
  } | null;

  reviewedBy?: {
    _id?: string;
    name?: string;
    email?: string;
  } | null;

  reviewedAt?: string | null;

  approvedCategoryId?:
    | string
    | {
        _id?: string;
        name?: string;
      }
    | null;

  adminNote?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

type CategoriesResponse = {
  categories?: Category[];
};

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "Not recorded";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function getStatusClasses(
  status: string,
) {
  switch (status) {
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    case "MERGED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getApprovedCategoryName(
  value:
    | CategoryRequest["approvedCategoryId"],
) {
  if (!value) {
    return null;
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  return (
    value.name ||
    value._id ||
    null
  );
}

export default async function CategoryRequestPage({
  params,
}: PageProps) {
  const token =
    await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const { id } =
    await params;

  const [
    requestsResponse,
    categoriesResponse,
  ] = await Promise.all([
    backendFetch(
      "/admin/category-requests",
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      },
    ),

    backendFetch(
      "/admin/categories?limit=100&skip=0",
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      },
    ),
  ]);

  if (
    requestsResponse.status ===
      401 ||
    requestsResponse.status ===
      403 ||
    categoriesResponse.status ===
      401 ||
    categoriesResponse.status ===
      403
  ) {
    redirect("/login");
  }

  if (
    !requestsResponse.ok
  ) {
    throw new Error(
      "Unable to load category request.",
    );
  }

  const requestData =
    await requestsResponse.json();

  const requests:
    CategoryRequest[] =
      Array.isArray(
        requestData,
      )
        ? requestData
        : Array.isArray(
              requestData?.requests,
            )
          ? requestData.requests
          : [];

  const categoryRequest =
    requests.find(
      (request) =>
        request._id === id,
    );

  if (!categoryRequest) {
    notFound();
  }

  let categories:
    Category[] = [];

  if (
    categoriesResponse.ok
  ) {
    const categoryData:
      CategoriesResponse =
        await categoriesResponse.json();

    categories =
      Array.isArray(
        categoryData.categories,
      )
        ? categoryData.categories
        : Array.isArray(
              categoryData,
            )
          ? categoryData
          : [];
  }

  const approvedCategory =
    getApprovedCategoryName(
      categoryRequest
        .approvedCategoryId,
    );

  const displayRequesterName =
    categoryRequest.requesterName ||
    categoryRequest.requestedBy
      ?.name ||
    "Not recorded";

  const displayRequesterEmail =
    categoryRequest.requesterEmail ||
    categoryRequest.requestedBy
      ?.email ||
    "No email recorded";

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/categories"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            ← Back to Categories
          </Link>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Category Request
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {
                categoryRequest
                  .requestedName
              }
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Review vendor-submitted
              service category request.
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusClasses(
              categoryRequest.status,
            )}`}
          >
            {
              categoryRequest.status
            }
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Request Details
              </h2>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Requester Name
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {
                      displayRequesterName
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Requester Email
                  </p>

                  <p className="mt-1 break-all font-semibold text-slate-900">
                    {
                      displayRequesterEmail
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Requested Category
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {
                      categoryRequest
                        .requestedName
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Description
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {categoryRequest.description ||
                      "No description provided."}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Submitted
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {formatDate(
                      categoryRequest.createdAt,
                    )}
                  </p>
                </div>
              </div>
            </section>

            {categoryRequest.status ===
            "PENDING" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Review Request
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Approve as a new
                  category, reject the
                  request, or merge it
                  with an existing
                  category.
                </p>

                <div className="mt-6">
                  <CategoryRequestReviewForm
                    requestId={
                      categoryRequest._id
                    }
                    requestedName={
                      categoryRequest
                        .requestedName
                    }
                    categories={
                      categories
                    }
                  />
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Review Completed
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  This category request
                  has already been
                  reviewed and cannot be
                  submitted again from
                  this page.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Result
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {
                        categoryRequest
                          .status
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Reviewed
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(
                        categoryRequest
                          .reviewedAt,
                      )}
                    </p>
                  </div>

                  {approvedCategory ? (
                    <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Category
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {
                          approvedCategory
                        }
                      </p>
                    </div>
                  ) : null}

                  {categoryRequest.adminNote ? (
                    <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Admin Note
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {
                          categoryRequest
                            .adminNote
                        }
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Requested By
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {
                  displayRequesterName
                }
              </p>

              <p className="mt-1 break-all text-sm text-slate-500">
                {
                  displayRequesterEmail
                }
              </p>
            </div>

            {categoryRequest.reviewedBy ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Reviewed By
                </p>

                <p className="mt-2 font-semibold text-slate-900">
                  {categoryRequest
                    .reviewedBy.name ||
                    "Admin"}
                </p>

                <p className="mt-1 break-all text-sm text-slate-500">
                  {categoryRequest
                    .reviewedBy.email ||
                    "No email recorded"}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Request ID
              </p>

              <p className="mt-2 break-all font-mono text-xs text-slate-600">
                {
                  categoryRequest._id
                }
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}