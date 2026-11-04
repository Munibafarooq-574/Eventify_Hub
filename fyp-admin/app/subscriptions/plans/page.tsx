import Link from "next/link";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { getAdminToken } from "@/lib/auth";
import { backendFetch } from "@/lib/backend";

const catalogPath = "/admin/subscription-catalog";
const pagePath = "/subscriptions/plans";
const limits = {
  maxPackages: "Packages",
  maxPortfolioImages: "Portfolio images",
  maxImagesPerPackage: "Images per package",
  monthlyCampaignLimit: "Monthly campaigns",
  featuredVendorLimit: "Featured vendor slots",
  featuredPackageLimit: "Featured package slots",
  couponLimit: "Active coupons",
  discountCodeLimit: "Active discount codes",
} as const;

type Feature = { key: string; name: string; controlsAccess: boolean };
type Plan = {
  key: string;
  name: string;
  description: string;
  monthlyPrice: number | null;
  rank: number;
  featureKeys: string[];
  limits: Record<keyof typeof limits, number>;
  isPurchasable: boolean;
  isMostPopular: boolean;
};
type Catalog = { plans: Plan[]; features: Feature[] };

async function catalogRequest(path: string, options: RequestInit = {}) {
  const token = await getAdminToken();
  if (!token) redirect("/login");
  return backendFetch(`${catalogPath}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function submitCatalog(path: string, method: string, payload: unknown) {
  let message = "Saved successfully.";
  let failed = false;
  const response = await catalogRequest(path, { method, body: JSON.stringify(payload) });
  if (!response.ok) {
    failed = true;
    const result = await response.json().catch(() => null);
    const detail = result?.message?.message ?? result?.message;
    message = typeof detail === "string" ? detail : "The change could not be saved.";
  }
  redirect(`${pagePath}?${failed ? "error" : "notice"}=${encodeURIComponent(message)}`);
}

async function addFeature(form: FormData) {
  "use server";
  await submitCatalog("/features", "POST", { name: form.get("name") });
}

async function deleteFeature(form: FormData) {
  "use server";
  const key = String(form.get("key") ?? "");
  await submitCatalog(`/features/${encodeURIComponent(key)}`, "DELETE", {});
}

async function togglePlan(form: FormData) {
  "use server";
  const key = String(form.get("key") ?? "");
  await submitCatalog(`/plans/${encodeURIComponent(key)}/active`, "PATCH", {
    active: form.get("active") === "true",
  });
}

async function savePlan(existingKey: string | null, form: FormData) {
  "use server";
  const key = existingKey ?? String(form.get("key") ?? "").trim();
  await submitCatalog(`/plans/${encodeURIComponent(key)}`, existingKey ? "PUT" : "POST", {
    name: form.get("name"),
    description: form.get("description"),
    monthlyPrice: Number(form.get("monthlyPrice")),
    rank: Number(form.get("rank")),
    isPurchasable: form.has("isPurchasable"),
    isMostPopular: form.has("isMostPopular"),
    featureKeys: form.getAll("featureKeys"),
    limits: Object.fromEntries(Object.keys(limits).map(key => [key, Number(form.get(key))])),
  });
}

const input = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950";
const button = "rounded-md bg-violet-700 px-4 py-2 font-semibold text-white hover:bg-violet-800";

function PlanForm({ plan, features }: { plan?: Plan; features: Feature[] }) {
  return (
    <form action={savePlan.bind(null, plan?.key ?? null)} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>Plan key
          <input name="key" className={input} required={!plan} pattern="[a-z][a-z0-9\-]{0,63}"
            placeholder="e.g. business-plus" defaultValue={plan?.key} readOnly={!!plan} />
        </label>
        <label>Display name
          <input name="name" className={input} required maxLength={80} defaultValue={plan?.name} />
        </label>
        <label>Monthly price (PKR)
          <input name="monthlyPrice" className={input} required type="number" min={1}
            step={1} defaultValue={plan?.monthlyPrice ?? undefined} />
        </label>
        <label>Plan rank
          <input name="rank" className={input} required type="number" min={1} step={1} defaultValue={plan?.rank ?? 1} />
          <span className="mt-1 block text-xs text-slate-600">Higher rank counts as an upgrade.</span>
        </label>
      </div>
      <label>Description
        <textarea name="description" className={input} maxLength={500} defaultValue={plan?.description} />
      </label>
      <div className="flex flex-wrap gap-5">
        <label><input name="isPurchasable" type="checkbox" defaultChecked={plan?.isPurchasable ?? false} /> Available for purchase</label>
        <label><input name="isMostPopular" type="checkbox" defaultChecked={plan?.isMostPopular ?? false} /> Show Most Popular badge</label>
      </div>
      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="px-2 font-semibold">Features</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {features.map(feature => (
            <label key={feature.key} className="flex items-start gap-2">
              <input type="checkbox" name="featureKeys" value={feature.key}
                defaultChecked={plan?.featureKeys.includes(feature.key)} className="mt-1" />
              <span>{feature.name}
                {!feature.controlsAccess && <span className="ml-1 text-xs text-slate-500">(display benefit)</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
        <legend className="px-2 font-semibold">Limits</legend>
        {Object.entries(limits).map(([key, label]) => (
          <label key={key}>{label}
            <input type="number" min={0} step={1} name={key} required className={input}
              defaultValue={plan?.limits[key as keyof typeof limits] ?? 0} />
          </label>
        ))}
      </fieldset>
      <button className={`${button} justify-self-start`} type="submit">{plan ? "Save plan" : "Create plan"}</button>
    </form>
  );
}

export default async function SubscriptionPlansPage({ searchParams }: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [params, response] = await Promise.all([searchParams, catalogRequest("")]);
  const catalog: Catalog | null = response.ok ? await response.json() : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <AdminSidebar />
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <Link href="/subscriptions" className="text-sm text-violet-700 underline">Subscription payments</Link>
        <h1 className="text-2xl font-bold">Subscription plans</h1>
        <p className="text-sm text-slate-600">Manage plan pricing, limits and benefits. Removing a plan from sale preserves its existing subscribers and payment history.</p>
        {params.error && <p role="alert" className="rounded-md bg-red-50 p-3 text-red-900">{params.error}</p>}
        {params.notice && <p role="status" className="rounded-md bg-green-50 p-3 text-green-900">{params.notice}</p>}
        {!catalog ? <p role="alert">Unable to load the subscription catalog.</p> : (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-2 font-bold">Add a feature to the list</h2>
              <p className="mb-3 text-sm text-slate-600">Custom features appear as benefits on selected plans. Features that control app access are marked separately.</p>
              <form action={addFeature} className="flex flex-wrap items-end gap-3">
                <label className="grow">Feature name<input className={input} name="name" required maxLength={100} /></label>
                <button className={button} type="submit">Add feature</button>
              </form>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-2 font-bold">Manage custom features</h2>
              <p className="mb-3 text-sm text-slate-600">Delete removes a custom display benefit from all plans. Deleting a built-in feature removes it from the catalog and every plan, and disables its subscription entitlement. Existing booking and payment records are preserved.</p>
              <div className="grid gap-2">
                {catalog.features.map(feature => (
                  <form key={feature.key} action={deleteFeature} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
                    <span>{feature.name} {feature.controlsAccess ? "(app feature)" : "(display benefit)"}</span>
                    <input type="hidden" name="key" value={feature.key} />
                    <button type="submit" className="rounded-md border border-red-300 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50">Delete</button>
                  </form>
                ))}

              </div>
            </section>
            <details className="rounded-xl border border-slate-200 bg-white p-5">
              <summary className="mb-4 cursor-pointer font-bold">Create a plan</summary>
              <PlanForm features={catalog.features} />
            </details>
            {catalog.plans.map(plan => (
              <div key={plan.key} className="rounded-xl border border-slate-200 bg-white p-5">
                <form action={togglePlan} className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-semibold">{plan.name} — {plan.isPurchasable ? "Active" : "Inactive"}</span>
                  <input type="hidden" name="key" value={plan.key} />
                  <input type="hidden" name="active" value={String(!plan.isPurchasable)} />
                  <button type="submit" disabled={plan.key === "free"} className={plan.isPurchasable ? "rounded-md border border-amber-400 px-3 py-2 text-amber-800" : "rounded-md border border-green-500 px-3 py-2 text-green-800"}>
                    {plan.isPurchasable ? "Deactivate plan" : "Activate plan"}
                  </button>
                </form>
                <details className="border-t border-slate-100 pt-3">
                <summary className="mb-4 cursor-pointer font-bold">
                  {plan.name} · {plan.isPurchasable ? "Available" : "Hidden"}
                </summary>
                <PlanForm plan={plan} features={catalog.features} />
                </details>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
