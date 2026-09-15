"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  campaignId: string;
  status: string;
};

export default function CampaignModerationActions({
  campaignId,
  status,
}: Props) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState<
    "APPROVE" | "REJECT" | null
  >(null);

  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const normalizedStatus = String(status || "").toLowerCase();

  const readErrorMessage = async (
    response: Response,
    fallback: string,
  ) => {
    try {
      const data = (await response.json()) as {
        message?: unknown;
      };

      return typeof data?.message === "string"
        ? data.message
        : fallback;
    } catch {
      return fallback;
    }
  };

  const approveCampaign = async () => {
    if (loadingAction) return;

    const confirmed = window.confirm(
      "Approve this campaign? It will become visible when its scheduled start date is reached.",
    );

    if (!confirmed) return;

    try {
      setLoadingAction("APPROVE");
      setError("");

      const response = await fetch(
        `/api/admin/campaigns/${campaignId}/approve`,
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Unable to approve campaign.",
          ),
        );
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to approve campaign.",
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const rejectCampaign = async () => {
    if (loadingAction) return;

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setError("Please enter a rejection reason.");
      return;
    }

    if (trimmedReason.length > 500) {
      setError(
        "Rejection reason cannot exceed 500 characters.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Reject this campaign submission?",
    );

    if (!confirmed) return;

    try {
      setLoadingAction("REJECT");
      setError("");

      const response = await fetch(
        `/api/admin/campaigns/${campaignId}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: trimmedReason,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Unable to reject campaign.",
          ),
        );
      }

      setShowReject(false);
      setReason("");

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to reject campaign.",
      );
    } finally {
      setLoadingAction(null);
    }
  };

  if (normalizedStatus === "approved") {
    return (
      <p className="text-xs font-semibold text-blue-700">
        Campaign approved
      </p>
    );
  }

  if (normalizedStatus === "active") {
    return (
      <p className="text-xs font-semibold text-emerald-700">
        Campaign active
      </p>
    );
  }

  if (normalizedStatus === "rejected") {
    return (
      <p className="text-xs font-semibold text-red-700">
        Campaign rejected
      </p>
    );
  }

  if (normalizedStatus === "cancelled") {
    return (
      <p className="text-xs font-semibold text-slate-500">
        Campaign cancelled
      </p>
    );
  }

  if (normalizedStatus === "expired") {
    return (
      <p className="text-xs font-semibold text-slate-500">
        Campaign expired
      </p>
    );
  }

  if (normalizedStatus !== "pending") {
    return (
      <p className="text-xs text-slate-500">
        No moderation action available
      </p>
    );
  }

  return (
    <div className="min-w-[230px]">
      {!showReject ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={approveCampaign}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "APPROVE"
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
            placeholder="Explain why this campaign cannot be approved"
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-red-400"
          />

          <div className="text-right text-[10px] text-slate-400">
            {reason.length}/500
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={Boolean(loadingAction)}
              onClick={rejectCampaign}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingAction === "REJECT"
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p className="mt-2 max-w-xs text-xs font-medium leading-5 text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}