// fyp-admin/components/AdminSidebar.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const navigation = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Analytics", href: "/analytics" },
      { label: "Bookings", href: "/bookings" },
      { label: "Vendors", href: "/vendors" },
      { label: "Clients", href: "/clients" },
      { label: "Categories", href: "/categories" },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Booking Payments", href: "/payments" },
      { label: "Refunds", href: "/refunds" },
      {
        label: "Subscription Payments",
        href: "/subscriptions",
      },
      { label: "Finance Overview", href: "/finance" },
    ],
  },
  {
  title: "MANAGEMENT",
  items: [
    { label: "Disputes", href: "/disputes" },
    { label: "Reviews", href: "/reviews" },
    { label: "Campaigns", href: "/campaigns" },
    { label: "Vendor Subscriptions", href: "/vendor-subscriptions" },
  ],
},
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const renderNav = (onNavigate?: () => void) => (
    <nav
      aria-label="Admin navigation"
      className="flex-1 space-y-6 overflow-y-auto px-4 py-6"
    >
      {navigation.map((section, index) => (
        <div key={section.title ?? `section-${index}`}>
          {section.title ? (
            <p className="mb-2 px-4 text-xs font-semibold tracking-wider text-slate-400">
              {section.title}
            </p>
          ) : null}

          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");

              const active =
                item.href === "/categories"
                  ? isActive &&
                    !pathname.startsWith("/categories/requests")
                  : isActive;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* ============ MOBILE / TABLET TOP BAR ============ */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Eventify Hub
          </p>

          <h1 className="mt-1 text-lg font-bold text-slate-950">
            Admin Console
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-100"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* ============ MOBILE DRAWER (overlay) ============ */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Eventify Hub
                </p>

                <h1 className="mt-2 text-xl font-bold text-slate-950">
                  Admin Console
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {renderNav(() => setOpen(false))}

            <div className="border-t border-slate-200 p-4">
              <LogoutButton />
            </div>
          </aside>
        </div>
      ) : null}

      {/* ============ DESKTOP STATIC SIDEBAR ============ */}
      <aside className="hidden h-full flex-col bg-white lg:flex">
        <div className="border-b border-slate-200 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Eventify Hub
          </p>

          <h1 className="mt-2 text-xl font-bold text-slate-950">
            Admin Console
          </h1>
        </div>

        {renderNav()}

        <div className="border-t border-slate-200 p-4">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}

