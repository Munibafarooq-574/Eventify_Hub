import type { PolicySettings, PolicyTier } from "@/lib/cancellation-policy";

export type SavedBookingPolicy = {
  schemaVersion: number;
  policyConfigId: string;
  policyRevision: number;
  capturedAt: string;
  selectedPolicy: string;
  settings: PolicySettings;
};

function TierTable({ title, tiers }: { title: string; tiers: PolicyTier[] }) {
  return <div><h4 className="mb-2 font-medium text-slate-900">{title}</h4>
    <table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200"><th className="py-2">Notice before service</th><th className="py-2">Percentage</th></tr></thead>
      <tbody>{tiers.map((tier, index) => <tr key={tier.minHoursBeforeEvent} className="border-b border-slate-100"><td className="py-2">{tier.minHoursBeforeEvent} hours{index < tiers.length - 1 ? ` to under ${tiers[index + 1].minHoursBeforeEvent} hours` : " or more"}{index === 0 ? " (also covers service started)" : ""}</td><td className="py-2">{tier.percentage}%</td></tr>)}</tbody>
    </table></div>;
}

export default function BookingPolicySnapshot({ snapshot }: { snapshot?: SavedBookingPolicy }) {
  const selected = snapshot?.selectedPolicy === "REFUNDABLE" ? snapshot.settings.clientRefunds.refundable
    : snapshot?.selectedPolicy === "NON-REFUNDABLE" ? snapshot.settings.clientRefunds.nonRefundable
    : snapshot?.settings.clientRefunds.partiallyRefundable;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
    <h3 className="text-lg font-semibold text-slate-950">Saved booking policy</h3>
    {!snapshot || !selected ? <p className="mt-3 text-sm text-slate-600">No saved policy snapshot is available for this booking. Current Admin rules have not been copied onto it.</p> : <>
      <p className="mt-2 text-sm text-slate-600">These terms were saved when this vendor booking was created. Later Admin policy edits do not change this record.</p>
      <dl className="my-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Selected policy</dt><dd className="font-medium">{snapshot.selectedPolicy}</dd></div><div><dt className="text-slate-500">Policy revision</dt><dd>{snapshot.policyRevision}</dd></div><div><dt className="text-slate-500">Captured at</dt><dd>{new Date(snapshot.capturedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC</dd></div></dl>
      <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer font-medium text-slate-900">View saved rules</summary><div className="mt-4 space-y-5">
        <TierTable title="Client cancellation refund (% of amount paid)" tiers={selected} />
        <TierTable title="Vendor-caused client refund (% of amount paid)" tiers={snapshot.settings.vendorCausedClientRefunds} />
        <TierTable title="Vendor penalty (% of booking price)" tiers={snapshot.settings.vendorPenalties} />
        <p className="text-sm text-slate-600">Saved payment hold: {snapshot.settings.paymentHoldHours} hours · Saved post-service issue window: {snapshot.settings.postServiceIssueWindowHours} hours</p>
      </div></details>
    </>}
  </section>;
}
