"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

  const normalizedStatus = String(status || "").toUpperCase();

  const resolvePayment = async (
    action: "CONFIRM" | "FAIL",
  ) => {
    if (loading) return;

    let reason = "";

    if (action === "CONFIRM") {
      const ok = window.confirm(
        "Confirm this booking payment as received? This will update the booking payment state and may send the client receipt email.",
      );

      if (!ok) return;
    } else {
      const entered = window.prompt(
        "Enter the reason this payment failed:",
      );

      if (entered === null) return;

      reason = entered.trim();

      if (!reason) {
        setError("Failure reason is required.");
        return;
      }

      const ok = window.confirm(
        "Mark this payment as failed?",
      );

      if (!ok) return;
    }

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
        const message =
          data &&
          typeof data === "object" &&
          "message" in data
            ? (data as { message?: unknown }).message
            : null;

        throw new Error(
          typeof message === "string"
            ? message
            : "Unable to update booking payment.",
        );
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update booking payment.",
      );
    } finally {
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
          onClick={() => resolvePayment("CONFIRM")}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "CONFIRM"
            ? "Confirming..."
            : "Confirm Payment"}
        </button>

        <button
          type="button"
          disabled={Boolean(loading)}
          onClick={() => resolvePayment("FAIL")}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "FAIL"
            ? "Updating..."
            : "Mark Failed"}
        </button>
      </div>

      {error ? (
        <p className="mt-2 max-w-xs text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
