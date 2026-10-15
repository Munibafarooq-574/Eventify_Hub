import type { PolicySettings, PolicyTier } from "@/lib/cancellation-policy";

export type SavedBookingPolicy = {
  schemaVersion: number;
  policyConfigId: string;
  policyRevision: number;
  capturedAt: string;
  selectedPolicy: string;
  settings: PolicySettings;
};

function notice(hours: number) {
  return hours > 0 && hours % 24 === 0 ? `${hours / 24} ${hours === 24 ? "day" : "days"}` : `${hours} ${hours === 1 ? "hour" : "hours"}`;
}
function refundSummary(tiers: PolicyTier[]) {
  const percentages = new Set(tiers.map(tier => tier.percentage));
  return percentages.size === 1 ? `${tiers[0].percentage}% of amount paid` : "Depends on notice before service";
}
function TierTable({ title, tiers }: { title: string; tiers: PolicyTier[] }) {
  return <div><h4 className="mb-2 font-medium text-slate-900">{title}</h4>
    <table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200"><th className="py-2 pr-3">Notice before service</th><th className="py-2">Percentage</th></tr></thead>
      <tbody>{tiers.map((tier, index) => <tr key={tier.minHoursBeforeEvent} className="border-b border-slate-100"><td className="py-2 pr-3">{tiers.length === 1 ? "Any notice period" : index === 0 ? `Less than ${notice(tiers[index + 1].minHoursBeforeEvent)}` : index < tiers.length - 1 ? `${notice(tier.minHoursBeforeEvent)} to under ${notice(tiers[index + 1].minHoursBeforeEvent)}` : `${notice(tier.minHoursBeforeEvent)} or more`}</td><td className="py-2">{tier.percentage}%</td></tr>)}</tbody>
    </table></div>;
}

export default function BookingPolicySnapshot({ snapshot }: { snapshot?: SavedBookingPolicy }) {
  const selected = snapshot?.selectedPolicy === "REFUNDABLE" ? snapshot.settings.clientRefunds.refundable
    : snapshot?.selectedPolicy === "NON-REFUNDABLE" ? snapshot.settings.clientRefunds.nonRefundable
    : snapshot?.settings.clientRefunds.partiallyRefundable;
  const policyLabel = snapshot?.selectedPolicy === "NON-REFUNDABLE" ? "Non-refundable"
    : snapshot?.selectedPolicy === "REFUNDABLE" ? "Refundable" : "Partially refundable";
  const captured = snapshot ? new Date(snapshot.capturedAt) : null;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
    <h3 className="text-lg font-semibold text-slate-950">Saved booking policy</h3>
    {!snapshot || !selected ? <p className="mt-3 text-sm text-slate-600">No saved policy snapshot is available for this booking. Current Admin rules have not been copied onto it.</p> : <>
      <p className="mt-2 text-sm text-slate-600">Rules recorded when this booking was created. Later Admin edits do not change these saved terms.</p>
      <div className="my-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4"><h4 className="text-sm font-medium text-slate-600">If the client cancels</h4><p className="mt-1 font-semibold">{policyLabel}</p><p className="mt-1 text-sm text-slate-600">Saved refund rule: {refundSummary(selected)}.</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><h4 className="text-sm font-medium text-slate-600">If the vendor cancels</h4><p className="mt-1 font-semibold">Client protection</p><p className="mt-1 text-sm text-slate-600">Saved refund rule: {refundSummary(snapshot.settings.vendorCausedClientRefunds)}.</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><h4 className="text-sm font-medium text-slate-600">Vendor penalty</h4><p className="mt-1 font-semibold">Calculated separately</p><p className="mt-1 text-sm text-slate-600">Uses the saved penalty rules and vendor booking price.</p></div>
      </div>
      <p className="mb-4 text-sm text-slate-500">These are saved rules, not a refund or penalty transaction. Cancellation eligibility is checked separately.</p>
      <p className="mb-4 text-xs text-slate-500">Policy revision {snapshot.policyRevision} · Saved {captured && !Number.isNaN(captured.getTime()) ? `${captured.toLocaleString("en-GB", { timeZone: "UTC" })} UTC` : "date unavailable"}</p>
      <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer font-medium text-slate-900">View detailed saved rules</summary><div className="mt-4 space-y-5">
        <TierTable title="Client cancellation refund (% of amount paid)" tiers={selected} />
        <TierTable title="Vendor-caused client refund (% of amount paid)" tiers={snapshot.settings.vendorCausedClientRefunds} />
        <TierTable title="Vendor penalty (% of booking price)" tiers={snapshot.settings.vendorPenalties} />
        <p className="text-sm text-slate-600">Saved payment hold: {notice(snapshot.settings.paymentHoldHours)} · Saved post-service issue window: {notice(snapshot.settings.postServiceIssueWindowHours)}</p>
        <p className="text-xs text-slate-500">The first notice tier also covers service already started. These ranges do not grant cancellation permission after service or completion.</p>
      </div></details>
    </>}
  </section>;
}
