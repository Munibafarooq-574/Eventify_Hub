"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RefundStatus =
  | "PENDING"
  | "PROCESSING"
  | "REFUNDED"
  | "REJECTED";

type Props = {
  refundId: string;
  currentStatus: RefundStatus;
};

export default function RefundStatusActions({
  refundId,
  currentStatus,
}: Props) {
  const router = useRouter();

  const [loadingStatus, setLoadingStatus] =
    useState<RefundStatus | null>(null);

  const updateStatus = async (
    status: RefundStatus,
  ) => {
    if (status === currentStatus) {
      return;
    }

    let message = "";

    if (status === "PROCESSING") {
      message =
        "Mark this refund as being processed/verified?";
    }

    if (status === "REFUNDED") {
      message =
        "Confirm that the refund settlement has been completed and the client received the refundable amount?";
    }

    if (status === "REJECTED") {
      message =
        "Reject this refund claim? This records the claim as rejected.";
    }

    if (status === "PENDING") {
      message =
        "Move this refund back to Pending?";
    }

    if (!window.confirm(message)) {
      return;
    }

    try {
      setLoadingStatus(status);

      const response = await fetch(
        `/api/admin/refunds/${refundId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to update refund status.",
        );
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to update refund status.",
      );
    } finally {
      setLoadingStatus(null);
    }
  };

  const disabled = loadingStatus !== null;

  return (
    <div className="flex min-w-[190px] flex-col gap-2">
      {currentStatus === "PENDING" ? (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              updateStatus("PROCESSING")
            }
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingStatus === "PROCESSING"
              ? "Updating..."
              : "Start Processing"}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              updateStatus("REJECTED")
            }
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingStatus === "REJECTED"
              ? "Updating..."
              : "Reject"}
          </button>
        </>
      ) : null}

      {currentStatus === "PROCESSING" ? (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              updateStatus("REFUNDED")
            }
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingStatus === "REFUNDED"
              ? "Updating..."
              : "Confirm Refunded"}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              updateStatus("REJECTED")
            }
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingStatus === "REJECTED"
              ? "Updating..."
              : "Reject"}
          </button>
        </>
      ) : null}

      {currentStatus === "REJECTED" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            updateStatus("PENDING")
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingStatus === "PENDING"
            ? "Updating..."
            : "Reopen"}
        </button>
      ) : null}

      {currentStatus === "REFUNDED" ? (
        <span className="text-xs font-semibold text-emerald-700">
          Settlement confirmed
        </span>
      ) : null}
    </div>
  );
}