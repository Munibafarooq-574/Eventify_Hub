"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  subscriptionId: string;
  paymentStatus: string;
};

export default function SubscriptionPaymentActions({
  subscriptionId,
  paymentStatus,
}: Props) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState<
    "PAID" | "FAILED" | null
  >(null);

  const [error, setError] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  const normalizedStatus = String(paymentStatus || "").toUpperCase();

  const submitDecision = async (
    status: "PAID" | "FAILED",
    rejectionReason?: string,
  ) => {
    if (loadingAction) {
      return;
    }

    if (status === "PAID") {
      const confirmed = window.confirm(
        "Confirm this subscription payment as received? This will activate the selected vendor subscription for the paid billing period.",
      );

      if (!confirmed) {
        return;
      }
    }

    if (status === "FAILED") {
      const trimmedReason = rejectionReason?.trim();

      if (!trimmedReason) {
        setError("Please enter a rejection reason.");
        return;
      }

      const confirmed = window.confirm(
        "Reject this subscription payment request?",
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      setLoadingAction(status);
      setError("");

      const response = await fetch(
        `/api/admin/subscription-payments/${subscriptionId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            reason:
              status === "FAILED"
                ? rejectionReason?.trim()
                : undefined,
          }),
        },
      );

      let data: unknown = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "message" in data
            ? (data as { message?: unknown }).message
            : null;

        throw new Error(
          typeof message === "string"
            ? message
            : "Unable to update subscription payment.",
        );
      }

      setShowReject(false);
      setReason("");

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update subscription payment.",
      );
    } finally {
      setLoadingAction(null);
    }
  };

  if (normalizedStatus === "PAID") {
    return (
      <div className="text-xs font-medium text-emerald-700">
        Payment verified
      </div>
    );
  }

  if (normalizedStatus === "FAILED") {
    return (
      <div className="text-xs font-medium text-red-700">
        Payment rejected
      </div>
    );
  }

  if (normalizedStatus !== "PENDING") {
    return (
      <div className="text-xs text-slate-500">
        No action available
      </div>
    );
  }

  return (
    <div className="min-w-[210px]">
      {!showReject ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => submitDecision("PAID")}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "PAID"
              ? "Approving..."
              : "Approve"}
          </button>

          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => {
              setError("");
              setShowReject(true);
            }}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-red-100 bg-red-50 p-3">
          <label className="block text-xs font-semibold text-red-800">
            Rejection reason
          </label>

          <textarea
            value={reason}
            disabled={Boolean(loadingAction)}
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
            rows={3}
            maxLength={500}
            placeholder="e.g. Payment reference could not be verified"
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-red-400"
          />

          <div className="flex gap-2">
            <button
              type="button"
              disabled={Boolean(loadingAction)}
              onClick={() => submitDecision("FAILED", reason)}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingAction === "FAILED"
                ? "Rejecting..."
                : "Confirm Reject"}
            </button>

            <button
              type="button"
              disabled={Boolean(loadingAction)}
              onClick={() => {
                setShowReject(false);
                setReason("");
                setError("");
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p className="mt-2 max-w-xs text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}