"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/api-error";

type Props = {
  paymentId: string;
  status: string;
};

export default function BookingPaymentActions({
  paymentId,
  status,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState<
    "CONFIRM" | "FAIL" | null
  >(null);

  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<"CONFIRM" | "FAIL" | null>(null);
  const [failureReason, setFailureReason] = useState("");
  const requestLock = useRef(false);

  const normalizedStatus = String(status || "").toUpperCase();

  const resolvePayment = async (
    action: "CONFIRM" | "FAIL",
  ) => {
    if (requestLock.current || loading || pendingAction !== action) return;
    const reason = failureReason.trim();
    if (action === "FAIL" && !reason) {
      setError("Failure reason is required.");
      return;
    }
    requestLock.current = true;

    try {
      setLoading(action);
      setError("");

      const response = await fetch(
        `/api/admin/booking-payments/${paymentId}/resolve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            ...(action === "FAIL"
              ? { reason }
              : {}),
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
        throw new Error(
          apiErrorMessage(data, "Unable to update booking payment."),
        );
      }

      setPendingAction(null);
      setFailureReason("");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update booking payment.",
      );
    } finally {
      requestLock.current = false;
      setLoading(null);
    }
  };

  if (normalizedStatus === "SUCCESS") {
    return (
      <span className="text-xs font-semibold text-emerald-700">
        Confirmed
      </span>
    );
  }

  if (normalizedStatus === "FAILED") {
    return (
      <span className="text-xs font-semibold text-red-700">
        Failed
      </span>
    );
  }

  if (normalizedStatus !== "PENDING") {
    return (
      <span className="text-xs text-slate-500">
        No action
      </span>
    );
  }

  return (
    <div className="min-w-[190px]">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(loading)}
          onClick={() => { setPendingAction("CONFIRM"); setError(""); }}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "CONFIRM"
            ? "Confirming..."
            : "Confirm Payment"}
        </button>

        <button
          type="button"
          disabled={Boolean(loading)}
          onClick={() => { setPendingAction("FAIL"); setError(""); }}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "FAIL"
            ? "Updating..."
            : "Mark Failed"}
        </button>
      </div>

      {pendingAction ? (
        <form onSubmit={(event) => { event.preventDefault(); void resolvePayment(pendingAction); }} className="mt-3 max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">{pendingAction === "FAIL" ? "Mark payment as failed" : "Confirm payment received"}</p>
          {pendingAction === "FAIL" ? (
            <label className="mt-2 block text-xs font-medium text-slate-700">
              Failure reason (required)
              <textarea autoFocus required value={failureReason} disabled={Boolean(loading)} onChange={(event) => setFailureReason(event.target.value)} rows={3} placeholder="Explain why this payment failed" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-slate-500 focus:outline-none" />
            </label>
          ) : <p className="mt-2 text-xs text-slate-600">Confirm this payment was received. This updates the booking payment state and may send the client receipt email.</p>}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={Boolean(loading)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{loading ? "Updating..." : pendingAction === "FAIL" ? "Confirm Failed" : "Confirm Received"}</button>
            <button type="button" disabled={Boolean(loading)} onClick={() => { setPendingAction(null); setFailureReason(""); setError(""); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">Cancel</button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 max-w-xs text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
