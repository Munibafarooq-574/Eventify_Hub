"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReviewStatus =
  | "visible"
  | "pending"
  | "hidden"
  | "rejected";

type Props = {
  reviewId: string;
  status?: ReviewStatus;
};

type TargetStatus =
  | "visible"
  | "hidden"
  | "rejected";

export default function ReviewModerationActions({
  reviewId,
  status = "visible",
}: Props) {
  const router = useRouter();

  const [loading, setLoading] =
    useState<TargetStatus | null>(null);

  const [error, setError] = useState("");

  async function moderate(
    targetStatus: TargetStatus,
    label: string,
    needsReason = false,
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to ${label.toLowerCase()} this review?`,
    );

    if (!confirmed) {
      return;
    }

    let reason = "";

    if (needsReason) {
      const entered = window.prompt(
        `Reason for ${label.toLowerCase()} (optional, maximum 500 characters):`,
        "",
      );

      if (entered === null) {
        return;
      }

      reason = entered.trim();

      if (reason.length > 500) {
        setError(
          "Moderation reason cannot exceed 500 characters.",
        );
        return;
      }
    }

    setLoading(targetStatus);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/reviews/${encodeURIComponent(
          reviewId,
        )}/moderate`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: targetStatus,
            ...(reason ? { reason } : {}),
          }),
        },
      );

      const payload = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload?.message === "string"
            ? payload.message
            : Array.isArray(payload?.message)
              ? payload.message.join(", ")
              : "Unable to moderate review.";

        throw new Error(message);
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to moderate review.",
      );
    } finally {
      setLoading(null);
    }
  }

  if (status === "rejected") {
    return (
      <div>
        <p className="text-sm text-slate-500">
          This review has been rejected. No further
          moderation action is available.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {status === "pending" ? (
          <>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                moderate(
                  "visible",
                  "Approve",
                )
              }
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "visible"
                ? "Approving..."
                : "Approve"}
            </button>

            <button
              type="button"
              disabled={loading !== null}
              onClick={() =>
                moderate(
                  "rejected",
                  "Reject",
                  true,
                )
              }
              className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "rejected"
                ? "Rejecting..."
                : "Reject"}
            </button>
          </>
        ) : null}

        {status === "visible" ? (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() =>
              moderate(
                "hidden",
                "Hide",
                true,
              )
            }
            className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === "hidden"
              ? "Hiding..."
              : "Hide Review"}
          </button>
        ) : null}

        {status === "hidden" ? (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() =>
              moderate(
                "visible",
                "Restore",
              )
            }
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === "visible"
              ? "Restoring..."
              : "Restore Review"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}