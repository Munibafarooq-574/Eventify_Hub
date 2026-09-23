import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import AdminSidebar from "@/components/AdminSidebar";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type DetailResponse = {
  vendor: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    brandName?: string | null;
    city?: string | null;
    categoryId?: string | null;
  };

  subscription: {
    subscriptionId: string;
    effectivePlan: string;
    status: string;
    isTrial: boolean;

    trialStartDate?: string | null;
    trialEndDate?: string | null;
    trialDaysRemaining: number;

    paidStartDate?: string | null;
    paidEndDate?: string | null;

    startDate?: string | null;
    endDate?: string | null;
  };

  history: Array<{
    subscriptionId: string;
    plan: string;
    status: string;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean;
    createdAt?: string | null;
  }>;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-PK",
    {
      dateStyle: "medium",
    },
  ).format(date);
}

function text(
  value?: string | null,
) {
  const clean =
    String(value || "").trim();

  return clean || "N/A";
}

function statusClass(
  status: string,
) {
  switch (
    status.toLowerCase()
  ) {
    case "trial":
      return "bg-blue-50 text-blue-700";
    case "active":
      return "bg-emerald-50 text-emerald-700";
    case "expired":
      return "bg-amber-50 text-amber-700";
    case "cancelled":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function VendorSubscriptionDetailPage({
  params,
}: PageProps) {
  const token =
    await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const { id } =
    await params;

  let detail:
    | DetailResponse
    | null = null;

  let errorMessage = "";

  try {
    const response =
      await backendFetch(
        `/admin/vendor-subscriptions/${encodeURIComponent(
          id,
        )}`,
        {
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      redirect("/login");
    }

    if (
      response.status === 404
    ) {
      notFound();
    }

    if (!response.ok) {
      const error =
        await response
          .json()
          .catch(() => null);

      errorMessage =
        typeof error?.message ===
        "string"
          ? error.message
          : "Unable to load vendor subscription.";
    } else {
      detail =
        (await response.json()) as DetailResponse;
    }
  } catch (error) {
    if (
      error &&
      typeof error ===
        "object" &&
      "digest" in error
    ) {
      throw error;
    }

    errorMessage =
      "Unable to connect to the backend.";
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="lg:flex">
        <AdminSidebar />

        <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Link
              href="/vendor-subscriptions"
              className="text-sm font-semibold text-slate-600 hover:text-slate-950"
            >
              ← Vendor Subscriptions
            </Link>

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
                {errorMessage}
              </div>
            ) : detail ? (
              <>
                <div className="mt-6">
                  <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                    Subscription Detail
                  </p>

                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h1 className="text-3xl font-bold">
                        {text(
                          detail.vendor
                            .name,
                        )}
                      </h1>

                      <p className="mt-1 text-sm text-slate-500">
                        {text(
                          detail.vendor
                            .brandName,
                        )}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-4 py-2 text-sm font-semibold capitalize ${statusClass(
                        detail.subscription
                          .status,
                      )}`}
                    >
                      {
                        detail.subscription
                          .status
                      }
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                      Effective Plan
                    </p>

                    <p className="mt-2 text-xl font-bold capitalize">
                      {
                        detail.subscription
                          .effectivePlan
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                      Status
                    </p>

                    <p className="mt-2 text-xl font-bold capitalize">
                      {
                        detail.subscription
                          .status
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                      Start Date
                    </p>

                    <p className="mt-2 font-semibold">
                      {formatDate(
                        detail.subscription
                          .startDate,
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                      End Date
                    </p>

                    <p className="mt-2 font-semibold">
                      {formatDate(
                        detail.subscription
                          .endDate,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-bold">
                      Vendor
                    </h2>

                    <dl className="mt-5 space-y-4 text-sm">
                      <div>
                        <dt className="text-slate-500">
                          Email
                        </dt>
                        <dd className="mt-1 font-semibold">
                          {text(
                            detail.vendor
                              .email,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-500">
                          Phone
                        </dt>
                        <dd className="mt-1 font-semibold">
                          {text(
                            detail.vendor
                              .phone,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-slate-500">
                          City
                        </dt>
                        <dd className="mt-1 font-semibold">
                          {text(
                            detail.vendor
                              .city,
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-bold">
                      Subscription Period
                    </h2>

                    {detail.subscription
                      .isTrial ? (
                      <div className="mt-5 space-y-4 text-sm">
                        <div>
                          <p className="text-slate-500">
                            Trial Start
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatDate(
                              detail
                                .subscription
                                .trialStartDate,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">
                            Trial End
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatDate(
                              detail
                                .subscription
                                .trialEndDate,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">
                            Remaining
                          </p>
                          <p className="mt-1 font-semibold">
                            {
                              detail
                                .subscription
                                .trialDaysRemaining
                            }{" "}
                            day(s)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-4 text-sm">
                        <div>
                          <p className="text-slate-500">
                            Paid Start
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatDate(
                              detail
                                .subscription
                                .paidStartDate,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">
                            Paid End
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatDate(
                              detail
                                .subscription
                                .paidEndDate,
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-6 py-5">
                    <h2 className="text-lg font-bold">
                      Subscription History
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Existing subscription lifecycle records for this vendor.
                    </p>
                  </div>

                  {detail.history
                    .length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      No subscription history found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[700px] w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-6 py-4">
                              Plan
                            </th>
                            <th className="px-6 py-4">
                              Status
                            </th>
                            <th className="px-6 py-4">
                              Start
                            </th>
                            <th className="px-6 py-4">
                              End
                            </th>
                            <th className="px-6 py-4">
                              Record
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {detail.history.map(
                            (item) => (
                              <tr
                                key={
                                  item.subscriptionId
                                }
                              >
                                <td className="px-6 py-4 font-semibold capitalize">
                                  {
                                    item.plan
                                  }
                                </td>

                                <td className="px-6 py-4 capitalize">
                                  {
                                    item.status
                                  }
                                </td>

                                <td className="px-6 py-4">
                                  {formatDate(
                                    item.startDate,
                                  )}
                                </td>

                                <td className="px-6 py-4">
                                  {formatDate(
                                    item.endDate,
                                  )}
                                </td>

                                <td className="px-6 py-4">
                                  {item.isCurrent
                                    ? "Current"
                                    : "Historical"}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
