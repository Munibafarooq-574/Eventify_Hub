"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Resolution =
  | "RESOLVED_ORGANIZER"
  | "RESOLVED_VENDOR"
  | "RESOLVED_PARTIAL";

export default function DisputeResolutionForm({
  disputeId,
  amountPaid,
}: {
  disputeId: string;
  amountPaid: number;
}) {
  const router = useRouter();

  const [resolution, setResolution] = useState<Resolution | "">("");
  const [notes, setNotes] = useState("");
  const [partialRefundAmount, setPartialRefundAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!resolution) {
      setError("Select a resolution.");
      return;
    }

    const amount = Number(partialRefundAmount);

    if (
      resolution === "RESOLVED_PARTIAL" &&
      (!partialRefundAmount.trim() ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > amountPaid)
    ) {
      setError(
        "Partial refund must be greater than zero and cannot exceed the paid amount.",
      );
      return;
    }

    const label = resolution.replaceAll("_", " ");

    if (
      !window.confirm(
        `Confirm final resolution: ${label}?\n\nThis decision cannot be changed from this form.`,
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/disputes/${encodeURIComponent(disputeId)}/resolve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resolution,
            notes: notes.trim(),
            ...(resolution === "RESOLVED_PARTIAL"
              ? { partialRefundAmount: amount }
              : {}),
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Unable to resolve dispute.",
        );
      }

      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to resolve dispute.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label
          htmlFor="resolution"
          className="block text-sm font-semibold text-slate-700"
        >
          Final resolution
        </label>

        <select
          id="resolution"
          required
          disabled={loading}
          value={resolution}
          onChange={(event) =>
            setResolution(event.target.value as Resolution | "")
          }
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
        >
          <option value="">Select resolution</option>
          <option value="RESOLVED_ORGANIZER">
            Resolve in client's favour
          </option>
          <option value="RESOLVED_VENDOR">
            Resolve in vendor's favour
          </option>
          <option value="RESOLVED_PARTIAL">
            Partial refund
          </option>
        </select>
      </div>

      {resolution === "RESOLVED_PARTIAL" && (
        <div>
          <label
            htmlFor="partialRefundAmount"
            className="block text-sm font-semibold text-slate-700"
          >
            Partial refund amount (PKR)
          </label>

          <p className="mt-1 text-xs text-slate-500">
            Successful payments: Rs{" "}
            {amountPaid.toLocaleString("en-PK")}
          </p>

          <input
            id="partialRefundAmount"
            type="number"
            min="0.01"
            max={amountPaid}
            step="0.01"
            required
            disabled={loading}
            value={partialRefundAmount}
            onChange={(event) =>
              setPartialRefundAmount(event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />
        </div>
      )}

      <div>
        <label
          htmlFor="resolutionNotes"
          className="block text-sm font-semibold text-slate-700"
        >
          Resolution notes
        </label>

        <textarea
          id="resolutionNotes"
          rows={4}
          disabled={loading}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Enter the reason for this decision..."
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !resolution}
        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Resolving..." : "Submit Final Resolution"}
      </button>
    </form>
  );
}