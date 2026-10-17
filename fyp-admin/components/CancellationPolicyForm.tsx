"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatNoticeHours } from '@/lib/booking-time';
import { readPolicy, type PolicyConfig, type PolicySettings, type PolicyTier } from "@/lib/cancellation-policy";

function errorMessage(data: unknown): string {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map(errorMessage).join(" ");
  if (data && typeof data === "object" && "message" in data) return errorMessage(data.message);
  return "Unable to save policy.";
}

function HoursInput({ label, value, min = 0, max = 87600, readOnly = false, onChange }: {
  label: string; value: number; min?: number; max?: number; readOnly?: boolean; onChange: (hours: number) => void;
}) {
  const firstInput = useRef<HTMLInputElement>(null);
  const days = Math.floor(value / 24);
  const hours = value % 24;
  useEffect(() => {
    firstInput.current?.setCustomValidity(value < min || value > max
      ? `Choose a duration between ${formatNoticeHours(min)} and ${formatNoticeHours(max)}.` : '');
  }, [value, min, max]);
  return <div role="group" aria-label={label} className="space-y-1">
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-500"><span className="block pb-1">Days</span><input ref={firstInput} aria-label={`${label} days`} type="number" required min="0" max={Math.floor(max / 24)} step="1" readOnly={readOnly} value={days} onChange={event => onChange(Number(event.target.value) * 24 + hours)} className="w-20 rounded-lg border border-slate-300 p-2 text-sm text-slate-950 read-only:bg-slate-100" /></label>
      <label className="text-xs text-slate-500"><span className="block pb-1">Hours</span><input aria-label={`${label} hours`} type="number" required min="0" max="23" step="1" readOnly={readOnly} value={hours} onChange={event => onChange(days * 24 + Number(event.target.value))} className="w-20 rounded-lg border border-slate-300 p-2 text-sm text-slate-950 read-only:bg-slate-100" /></label>
    </div>
    <p className="text-xs text-slate-500">{formatNoticeHours(value)}</p>
  </div>;
}

function TierEditor({ title, description, tiers, disabled, onChange }: {
  title: string; description: string; tiers: PolicyTier[]; disabled: boolean; onChange: (tiers: PolicyTier[]) => void;
}) {
  return <fieldset disabled={disabled} className="rounded-2xl border border-slate-200 bg-white p-5">
    <legend className="px-2 font-semibold text-slate-950">{title}</legend>
    <p className="mb-4 text-sm text-slate-600">{description}</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead><tr><th className="p-2">Minimum notice</th><th className="p-2">Percentage</th><th className="p-2"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{tiers.map((tier, index) => <tr key={index} className="border-t border-slate-100">
        <td className="p-2"><HoursInput label={`${title} tier ${index + 1} minimum notice`} value={tier.minHoursBeforeEvent} min={index === 0 ? 0 : tiers[index - 1].minHoursBeforeEvent + 1} max={index < tiers.length - 1 ? tiers[index + 1].minHoursBeforeEvent - 1 : 87600} readOnly={index === 0} onChange={hours => onChange(tiers.map((row, rowIndex) => rowIndex === index ? { ...row, minHoursBeforeEvent: hours } : row))} /></td>
        <td className="p-2"><input aria-label={`${title} tier ${index + 1} percentage`} type="number" required min="0" max="100" step="1" value={tier.percentage} onChange={event => onChange(tiers.map((row, rowIndex) => rowIndex === index ? { ...row, percentage: Number(event.target.value) } : row))} className="w-24 rounded-lg border border-slate-300 p-2" /> %</td>
        <td className="p-2">{index > 0 && <button type="button" aria-label={`Remove ${title} tier ${index + 1}`} onClick={() => onChange(tiers.filter((_row, rowIndex) => rowIndex !== index))} className="text-red-700 underline">Remove</button>}</td>
      </tr>)}</tbody>
    </table></div>
    <button type="button" disabled={tiers.length >= 20 || tiers[tiers.length - 1].minHoursBeforeEvent >= 87600} onClick={() => onChange([...tiers, { minHoursBeforeEvent: Math.min(87600, tiers[tiers.length - 1].minHoursBeforeEvent + 24), percentage: tiers[tiers.length - 1].percentage }])} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">Add time tier</button>
  </fieldset>;
}

export default function CancellationPolicyForm() {
  const [config, setConfig] = useState<PolicyConfig | null>(null);
  const [settings, setSettings] = useState<PolicySettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/admin/cancellation-policy", { cache: "no-store", signal: abort.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(errorMessage(data));
        const loaded = readPolicy(data);
        setConfig(loaded); setSettings(loaded.policySettings); setError(""); setSuccess("");
      } catch (err) {
        if (!abort.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load policy.");
      }
    }
    void load();
    return () => abort.abort();
  }, [retry]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings || !config || busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      readPolicy({ policyRevision: config.policyRevision, policySettings: settings });
      const response = await fetch("/api/admin/cancellation-policy", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: config.policyRevision, policySettings: settings }) });
      const data = await response.json();
      if (!response.ok) throw new Error(errorMessage(data));
      const updated = readPolicy(data);
      setConfig(updated); setSettings(updated.policySettings); setSuccess("Policy saved for new bookings. Existing saved booking terms and payment deadlines are unchanged.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save policy."); }
    finally { setBusy(false); }
  }
  const dirty = settings && config && JSON.stringify(settings) !== JSON.stringify(config.policySettings);
  function change(next: PolicySettings) { setSettings(next); setSuccess(""); }
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-950">Cancellation policy</h1><p className="mt-2 text-sm text-slate-600">Configure client refunds, vendor cancellation protection and policy durations.</p></div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 space-y-2">
      <p className="font-semibold">Policy settings — saved with new bookings</p>
      <p>New vendor bookings save a copy of these rules. Client cancellation uses the rules saved with that booking. Later changes do not rewrite those terms. Vendor cancellation rules and durations remain pending their separate rollout.</p>
      <p>Refund percentages apply to the amount paid. Vendor penalties apply separately to the vendor booking price. Each tier applies from its minimum notice until the next threshold; the final tier has no upper limit. Normal client cancellation is unavailable once service has started.</p>
    </div>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" disabled={busy} className="ml-3 underline" onClick={() => setRetry(value => value + 1)}>Reload saved policy</button></div>}
    {success && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
    {!settings ? <p className="text-slate-600">{error ? "Settings unavailable." : "Loading policy…"}</p> : <form onSubmit={save} className="space-y-5">
      <p className="text-xs text-slate-500">Policy revision {config?.policyRevision}. A day equals 24 hours.</p>
      {([['refundable', 'Refundable'], ['partiallyRefundable', 'Partially refundable'], ['nonRefundable', 'Non-refundable']] as const).map(([key, label]) => <TierEditor key={key} title={`Client cancellation — ${label}`} description="Percentage refunded when the client chooses to cancel under the policy saved with their booking." tiers={settings.clientRefunds[key]} disabled={busy} onChange={tiers => change({ ...settings, clientRefunds: { ...settings.clientRefunds, [key]: tiers } })} />)}
      <TierEditor title="Vendor cancellation — client protection" description="Percentage refunded when the vendor cancels, independent of the package refund policy." tiers={settings.vendorCausedClientRefunds} disabled={busy} onChange={tiers => change({ ...settings, vendorCausedClientRefunds: tiers })} />
      <TierEditor title="Vendor cancellation — vendor penalty" description="Separate penalty percentage of the vendor booking price." tiers={settings.vendorPenalties} disabled={busy} onChange={tiers => change({ ...settings, vendorPenalties: tiers })} />
      <fieldset disabled={busy} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"><legend className="px-2 font-semibold">Durations</legend>
        <div className="flex flex-wrap items-center gap-4 text-sm"><span>Payment hold</span><HoursInput label="Payment hold" value={settings.paymentHoldHours} min={1} max={8760} onChange={hours => change({ ...settings, paymentHoldHours: hours })} /></div>
        <div className="flex flex-wrap items-center gap-4 text-sm"><span>Post-service issue window</span><HoursInput label="Post-service issue window" value={settings.postServiceIssueWindowHours} min={1} max={8760} onChange={hours => change({ ...settings, postServiceIssueWindowHours: hours })} /></div>
        <p className="text-xs text-slate-500">The initial 3-day issue window is an editable draft value. It is not enforced until the issue-reporting rollout.</p>
      </fieldset>
      <div className="flex gap-3"><button disabled={!dirty || busy} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Save policy"}</button><button type="button" disabled={!dirty || busy} onClick={() => { setSettings(config?.policySettings ?? null); setError(""); setSuccess(""); }} className="rounded-xl border border-slate-300 px-5 py-3 text-sm disabled:opacity-40">Discard changes</button></div>
    </form>}
  </div>;
}
