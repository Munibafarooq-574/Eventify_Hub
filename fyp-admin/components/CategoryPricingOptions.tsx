"use client";

const OPTIONS = [
  ['FIXED', 'Fixed Package'],
  ['PER_PERSON', 'Per Person'],
  ['GROUP', 'Group Package'],
] as const;

export default function CategoryPricingOptions({ value, onChange }: {
  value: string[]; onChange: (value: string[]) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
      <legend className="px-2 text-sm font-semibold text-slate-800">Allowed Pricing Methods</legend>
      <p className="text-sm text-slate-500">Vendors choose one of these methods for each package. Select at least one. Existing packages keep their saved pricing.</p>
      <div className="flex flex-wrap gap-4">
        {OPTIONS.map(([code, label]) => (
          <label key={code} className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
            <input type="checkbox" checked={value.includes(code)} onChange={event => {
              const next = event.target.checked ? [...value, code] : value.filter(item => item !== code);
              if (next.length) onChange(next);
            }} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
