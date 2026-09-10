import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import LogoutButton from "@/components/LogoutButton";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

type VendorPackage = {
  _id?: string;
  packageName?: string;
  price?: number;
  services?: string;
};

type Category = {
  _id: string;
  name: string;
};

type VendorDetail = {
  vendorId: string;
  name: string;
  brandName: string;
  accountEmail: string;
  bookingEmail: string;
  phoneNumber: string;
  city: string;
  officialAddress: string;
  website: string | null;
  instagramLink: string | null;
  facebookLink: string | null;
  officialGoogleLink: string | null;
  brandLogo: string | null;
  coverImage: string | null;
  categoryId: string | null;
  packages: VendorPackage[];
  images: string[];
  packageCount: number;
  imageCount: number;
  businessDetails: Record<
    string,
    unknown
  > | null;
  availabilitySettings: Record<
    string,
    unknown
  > | null;
  availabilityConfigured: boolean;
  isOnline: boolean;
  lastSeen: string | null;
  profileComplete: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(
  value?: string | null,
) {
  if (!value) {
    return "N/A";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "N/A";
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

function money(
  value?: number,
) {
  return `Rs ${Number(
    value || 0,
  ).toLocaleString(
    "en-PK",
  )}`;
}

function displayValue(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "N/A";
  }

  if (
    typeof value ===
    "boolean"
  ) {
    return value
      ? "Yes"
      : "No";
  }

  if (
    Array.isArray(value)
  ) {
    return value.length
      ? value.join(", ")
      : "N/A";
  }

  if (
    typeof value ===
    "object"
  ) {
    return JSON.stringify(
      value,
    );
  }

  return String(value);
}

function humanizeKey(
  key: string,
) {
  return key
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2",
    )
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

export default async function VendorDetailPage({
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
    vendorResponse,
    categoryResponse,
  ] = await Promise.all([
    backendFetch(
      `/admin/vendors/${encodeURIComponent(
        id,
      )}`,
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
    vendorResponse.status ===
      401 ||
    vendorResponse.status ===
      403
  ) {
    redirect("/login");
  }

  if (
    vendorResponse.status ===
    404
  ) {
    notFound();
  }

  if (
    !vendorResponse.ok
  ) {
    throw new Error(
      "Unable to load vendor details.",
    );
  }

  const vendor =
    (await vendorResponse.json()) as
      | VendorDetail
      | null;

  if (!vendor) {
    notFound();
  }

  const categories: Category[] =
    categoryResponse.ok
      ? ((await categoryResponse.json()) as Category[])
      : [];

  const category =
    categories.find(
      (item) =>
        item._id ===
        vendor.categoryId,
    );

  const businessEntries =
    vendor.businessDetails
      ? Object.entries(
          vendor.businessDetails,
        ).filter(
          ([key]) =>
            key !== "_id",
        )
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
              href="/vendors"
              className="block rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Vendors
            </Link>

            <div className="rounded-xl px-4 py-3 text-sm text-slate-400">
              Clients
            </div>

            <div className="rounded-xl px-4 py-3 text-sm text-slate-400">
              Categories
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <LogoutButton />
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
            <div className="mx-auto flex max-w-[1400px] items-center justify-between">
              <div>
                <Link
                  href="/vendors"
                  className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                >
                  ← Back to Vendors
                </Link>

                <h2 className="mt-2 text-2xl font-bold">
                  Vendor Details
                </h2>
              </div>

              <div className="lg:hidden">
                <LogoutButton />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1400px] space-y-6 p-5 sm:p-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">
                      {
                        vendor.brandName
                      }
                    </h1>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        vendor.profileComplete
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {vendor.profileComplete
                        ? "Profile Complete"
                        : "Profile Incomplete"}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        vendor.isOnline
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {vendor.isOnline
                        ? "Online"
                        : "Offline"}
                    </span>
                  </div>

                  <p className="mt-2 text-base text-slate-500">
                    {
                      vendor.name
                    }
                  </p>

                  <p className="mt-3 text-sm text-slate-500">
                    Vendor ID:{" "}
                    <span className="font-mono text-slate-700">
                      {
                        vendor.vendorId
                      }
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniStat
                    label="Packages"
                    value={String(
                      vendor.packageCount,
                    )}
                  />

                  <MiniStat
                    label="Images"
                    value={String(
                      vendor.imageCount,
                    )}
                  />
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <InfoSection title="Account Information">
                <InfoRow
                  label="Account Name"
                  value={
                    vendor.name
                  }
                />

                <InfoRow
                  label="Account Email"
                  value={
                    vendor.accountEmail
                  }
                />

                <InfoRow
                  label="Registered"
                  value={formatDateTime(
                    vendor.createdAt,
                  )}
                />

                <InfoRow
                  label="Last Updated"
                  value={formatDateTime(
                    vendor.updatedAt,
                  )}
                />

                <InfoRow
                  label="Last Seen"
                  value={formatDateTime(
                    vendor.lastSeen,
                  )}
                />
              </InfoSection>

              <InfoSection title="Business Contact">
                <InfoRow
                  label="Brand"
                  value={
                    vendor.brandName
                  }
                />

                <InfoRow
                  label="Booking Email"
                  value={
                    vendor.bookingEmail
                  }
                />

                <InfoRow
                  label="Phone"
                  value={
                    vendor.phoneNumber
                  }
                />

                <InfoRow
                  label="City"
                  value={
                    vendor.city
                  }
                />

                <InfoRow
                  label="Address"
                  value={
                    vendor.officialAddress
                  }
                />
              </InfoSection>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <InfoSection title="Business Classification">
                <InfoRow
                  label="Category"
                  value={
                    category?.name ||
                    vendor.categoryId ||
                    "N/A"
                  }
                />

                <InfoRow
                  label="Profile"
                  value={
                    vendor.profileComplete
                      ? "Complete"
                      : "Incomplete"
                  }
                />

                <InfoRow
                  label="Availability"
                  value={
                    vendor.availabilityConfigured
                      ? "Configured"
                      : "Not configured"
                  }
                />
              </InfoSection>

              <InfoSection title="Business Links">
                <LinkRow
                  label="Website"
                  value={
                    vendor.website
                  }
                />

                <LinkRow
                  label="Instagram"
                  value={
                    vendor.instagramLink
                  }
                />

                <LinkRow
                  label="Facebook"
                  value={
                    vendor.facebookLink
                  }
                />

                <LinkRow
                  label="Google Maps"
                  value={
                    vendor.officialGoogleLink
                  }
                />
              </InfoSection>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold">
                  Packages
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    vendor.packageCount
                  }{" "}
                  package(s)
                </p>
              </div>

              {vendor.packages.length ===
              0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500">
                  Vendor has not
                  created any
                  packages yet.
                </div>
              ) : (
                <div className="grid gap-4 p-6 lg:grid-cols-2">
                  {vendor.packages.map(
                    (
                      pkg,
                      index,
                    ) => (
                      <article
                        key={
                          pkg._id ||
                          `${pkg.packageName}-${index}`
                        }
                        className="rounded-xl border border-slate-200 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-bold">
                              {pkg.packageName ||
                                `Package ${
                                  index +
                                  1
                                }`}
                            </h3>

                            <p className="mt-2 text-lg font-bold">
                              {money(
                                pkg.price,
                              )}
                            </p>
                          </div>
                        </div>

                        {pkg.services ? (
                          <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                            {
                              pkg.services
                            }
                          </p>
                        ) : null}
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold">
                  Business Details
                </h2>
              </div>

              {businessEntries.length ===
              0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="font-semibold">
                    Business details
                    not completed
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    This vendor has
                    not completed
                    the business
                    profile yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-x-8 gap-y-5 p-6 md:grid-cols-2">
                  {businessEntries.map(
                    ([
                      key,
                      value,
                    ]) => (
                      <div
                        key={key}
                        className="border-b border-slate-100 pb-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {humanizeKey(
                            key,
                          )}
                        </p>

                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {displayValue(
                            value,
                          )}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">
                Availability
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <MiniStat
                  label="Configured"
                  value={
                    vendor.availabilityConfigured
                      ? "Yes"
                      : "No"
                  }
                />

                <MiniStat
                  label="Current Status"
                  value={
                    vendor.isOnline
                      ? "Online"
                      : "Offline"
                  }
                />

                <MiniStat
                  label="Last Seen"
                  value={formatDateTime(
                    vendor.lastSeen,
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">
                System Information
              </h2>

              <div className="mt-5 space-y-3">
                <InfoRow
                  label="Vendor ID"
                  value={
                    vendor.vendorId
                  }
                />

                <InfoRow
                  label="Category ID"
                  value={
                    vendor.categoryId ||
                    "N/A"
                  }
                />

                <InfoRow
                  label="Created"
                  value={formatDateTime(
                    vendor.createdAt,
                  )}
                />

                <InfoRow
                  label="Updated"
                  value={formatDateTime(
                    vendor.updatedAt,
                  )}
                />
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">
        {title}
      </h2>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-6">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="break-all text-sm font-semibold text-slate-800 sm:text-right">
        {value || "N/A"}
      </span>
    </div>
  );
}

function LinkRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-6">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sm font-semibold text-blue-600 hover:underline sm:text-right"
        >
          Open
        </a>
      ) : (
        <span className="text-sm font-semibold text-slate-400">
          N/A
        </span>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}