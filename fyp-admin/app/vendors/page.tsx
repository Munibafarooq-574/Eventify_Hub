import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/LogoutButton";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

const PAGE_SIZE = 20;
const FETCH_LIMIT = PAGE_SIZE + 1;

type VendorRow = {
  vendorId: string;
  name: string;
  brandName: string;
  email: string;
  accountEmail: string;
  phoneNumber: string;
  city: string;
  brandLogo: string | null;
  coverImage: string | null;
  categoryId: string | null;
  packageCount: number;
  imageCount: number;
  isOnline: boolean;
  lastSeen: string | null;
  availabilityConfigured: boolean;
  profileComplete: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type Category = {
  _id: string;
  name: string;
  isActive?: boolean;
};

type PageProps = {
  searchParams: Promise<{
    search?: string;
    city?: string;
    categoryId?: string;
    page?: string;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function vendorUrl({
  search,
  city,
  categoryId,
  page,
}: {
  search?: string;
  city?: string;
  categoryId?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (search?.trim()) {
    params.set("search", search.trim());
  }

  if (city?.trim()) {
    params.set("city", city.trim());
  }

  if (categoryId?.trim()) {
    params.set("categoryId", categoryId.trim());
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return `/vendors${query ? `?${query}` : ""}`;
}

function getInitials(
  brandName?: string,
  name?: string,
) {
  const source =
    brandName?.trim() ||
    name?.trim() ||
    "V";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default async function VendorsPage({
  searchParams,
}: PageProps) {
  const token = await getAdminToken();

  if (!token) {
    redirect("/login");
  }

  const params = await searchParams;

  const search =
    typeof params.search === "string"
      ? params.search.trim()
      : "";

  const city =
    typeof params.city === "string"
      ? params.city.trim()
      : "";

  const categoryId =
    typeof params.categoryId === "string"
      ? params.categoryId.trim()
      : "";

  const parsedPage = Number(params.page);

  const currentPage =
    Number.isInteger(parsedPage) &&
    parsedPage > 0
      ? parsedPage
      : 1;

  const skip =
    (currentPage - 1) *
    PAGE_SIZE;

  const vendorQuery =
    new URLSearchParams();

  vendorQuery.set(
    "limit",
    String(FETCH_LIMIT),
  );

  vendorQuery.set(
    "skip",
    String(skip),
  );

  if (search) {
    vendorQuery.set(
      "search",
      search,
    );
  }

  if (city) {
    vendorQuery.set(
      "city",
      city,
    );
  }

  if (categoryId) {
    vendorQuery.set(
      "categoryId",
      categoryId,
    );
  }

  const [
    vendorResponse,
    categoryResponse,
  ] = await Promise.all([
    backendFetch(
      `/admin/vendors?${vendorQuery.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    ),

    backendFetch(
      "/category",
      {
        method: "GET",
        cache: "no-store",
      },
    ),
  ]);

  if (
    vendorResponse.status === 401 ||
    vendorResponse.status === 403
  ) {
    redirect("/login");
  }

  if (!vendorResponse.ok) {
    throw new Error(
      "Unable to load vendors.",
    );
  }

  const rawVendors =
    (await vendorResponse.json()) as VendorRow[];

  const categories: Category[] =
    categoryResponse.ok
      ? ((await categoryResponse.json()) as Category[])
      : [];

  if (
    rawVendors.length === 0 &&
    currentPage > 1
  ) {
    redirect(
      vendorUrl({
        search,
        city,
        categoryId,
        page: 1,
      }),
    );
  }

  const hasNext =
    rawVendors.length >
    PAGE_SIZE;

  const vendors =
    rawVendors.slice(
      0,
      PAGE_SIZE,
    );

  const startNumber =
    vendors.length === 0
      ? 0
      : skip + 1;

  const endNumber =
    skip + vendors.length;

  const completeProfiles =
    vendors.filter(
      (vendor) =>
        vendor.profileComplete,
    ).length;

  const incompleteProfiles =
    vendors.length -
    completeProfiles;

  const onlineVendors =
    vendors.filter(
      (vendor) =>
        vendor.isOnline,
    ).length;

  const categoryMap =
    new Map(
      categories.map(
        (category) => [
          category._id,
          category.name,
        ],
      ),
    );

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
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Bookings
            </Link>

            <Link
              href="/vendors"
              className="block rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Vendors
            </Link>

            <div className="rounded-xl px-4 py-3 text-sm font-medium text-slate-400">
              Clients
            </div>

            <div className="rounded-xl px-4 py-3 text-sm font-medium text-slate-400">
              Categories
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <LogoutButton />
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Management
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight">
                  Vendors
                </h2>
              </div>

              <div className="lg:hidden">
                <LogoutButton />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
            <div>
              <h3 className="text-3xl font-bold tracking-tight">
                Vendor Management
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Inspect vendor accounts,
                profile completion,
                business information and
                packages.
              </p>
            </div>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Showing"
                value={
                  vendors.length === 0
                    ? "0"
                    : `${startNumber}-${endNumber}`
                }
              />

              <SummaryCard
                label="Complete Profiles"
                value={String(
                  completeProfiles,
                )}
              />

              <SummaryCard
                label="Incomplete Profiles"
                value={String(
                  incompleteProfiles,
                )}
              />

              <SummaryCard
                label="Online Now"
                value={String(
                  onlineVendors,
                )}
              />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <form
                method="GET"
                action="/vendors"
                className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr_auto]"
              >
                <div>
                  <label
                    htmlFor="search"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Search
                  </label>

                  <input
                    id="search"
                    name="search"
                    defaultValue={
                      search
                    }
                    placeholder="Name, brand, email or phone"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="city"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    City
                  </label>

                  <input
                    id="city"
                    name="city"
                    defaultValue={city}
                    placeholder="Islamabad"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="categoryId"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Category
                  </label>

                  <select
                    id="categoryId"
                    name="categoryId"
                    defaultValue={
                      categoryId
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  >
                    <option value="">
                      All Categories
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={
                            category._id
                          }
                          value={
                            category._id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Apply
                  </button>

                  <Link
                    href="/vendors"
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Reset
                  </Link>
                </div>
              </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">
                      Vendor Accounts
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Page {currentPage}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {vendors.length} shown
                  </span>
                </div>
              </div>

              {vendors.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-lg font-semibold">
                    No vendors found
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Try changing the
                    current search or
                    filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1180px] w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-4">
                          Vendor
                        </th>

                        <th className="px-5 py-4">
                          Contact
                        </th>

                        <th className="px-5 py-4">
                          City
                        </th>

                        <th className="px-5 py-4">
                          Category
                        </th>

                        <th className="px-5 py-4">
                          Profile
                        </th>

                        <th className="px-5 py-4">
                          Availability
                        </th>

                        <th className="px-5 py-4">
                          Packages
                        </th>

                        <th className="px-5 py-4">
                          Joined
                        </th>

                        <th className="px-5 py-4 text-right">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {vendors.map(
                        (vendor) => (
                          <tr
                            key={
                              vendor.vendorId
                            }
                            className="transition hover:bg-slate-50/80"
                          >
                            <td className="px-5 py-5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                                  {getInitials(
                                    vendor.brandName,
                                    vendor.name,
                                  )}
                                </div>

                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {
                                      vendor.brandName
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {
                                      vendor.name
                                    }
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-5">
                              <p className="text-sm font-medium">
                                {
                                  vendor.email
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  vendor.phoneNumber
                                }
                              </p>
                            </td>

                            <td className="px-5 py-5 text-sm">
                              {
                                vendor.city
                              }
                            </td>

                            <td className="px-5 py-5">
                              <span className="text-sm">
                                {vendor.categoryId
                                  ? categoryMap.get(
                                      vendor.categoryId,
                                    ) ||
                                    vendor.categoryId
                                  : "N/A"}
                              </span>
                            </td>

                            <td className="px-5 py-5">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                  vendor.profileComplete
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-amber-200 bg-amber-50 text-amber-700"
                                }`}
                              >
                                {vendor.profileComplete
                                  ? "Complete"
                                  : "Incomplete"}
                              </span>
                            </td>

                            <td className="px-5 py-5">
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex items-center gap-2 text-xs font-semibold ${
                                    vendor.isOnline
                                      ? "text-emerald-700"
                                      : "text-slate-500"
                                  }`}
                                >
                                  <span
                                    className={`h-2 w-2 rounded-full ${
                                      vendor.isOnline
                                        ? "bg-emerald-500"
                                        : "bg-slate-300"
                                    }`}
                                  />

                                  {vendor.isOnline
                                    ? "Online"
                                    : "Offline"}
                                </span>

                                <p className="text-xs text-slate-500">
                                  {vendor.availabilityConfigured
                                    ? "Configured"
                                    : "Not configured"}
                                </p>
                              </div>
                            </td>

                            <td className="px-5 py-5">
                              <p className="font-semibold">
                                {
                                  vendor.packageCount
                                }
                              </p>

                              <p className="text-xs text-slate-500">
                                {
                                  vendor.imageCount
                                }{" "}
                                images
                              </p>
                            </td>

                            <td className="px-5 py-5 text-sm text-slate-600">
                              {formatDate(
                                vendor.createdAt,
                              )}
                            </td>

                            <td className="px-5 py-5 text-right">
                              <Link
                                href={`/vendors/${encodeURIComponent(
                                  vendor.vendorId,
                                )}`}
                                className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                View details
                              </Link>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                {currentPage > 1 ? (
                  <Link
                    href={vendorUrl({
                      search,
                      city,
                      categoryId,
                      page:
                        currentPage -
                        1,
                    })}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-300">
                    Previous
                  </span>
                )}

                <span className="text-sm font-medium text-slate-600">
                  Page {currentPage}
                </span>

                {hasNext ? (
                  <Link
                    href={vendorUrl({
                      search,
                      city,
                      categoryId,
                      page:
                        currentPage +
                        1,
                    })}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-300">
                    Next
                  </span>
                )}
              </div>
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
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}