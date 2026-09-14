"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type VendorApprovalStatus =
  | "INCOMPLETE"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

type Props = {
  vendorId: string;
  currentStatus:
    VendorApprovalStatus;
  currentRejectionReason?:
    string | null;
};

export default function VendorApprovalActions({
  vendorId,
  currentStatus,
  currentRejectionReason,
}: Props) {
  const router =
    useRouter();

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState(
    currentRejectionReason || "",
  );

  const [
    loadingAction,
    setLoadingAction,
  ] = useState<
    "APPROVED" |
    "REJECTED" |
    null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  async function submitReview(
    status:
      | "APPROVED"
      | "REJECTED",
  ) {
    setError("");
    setSuccess("");

    if (
      status === "REJECTED" &&
      !rejectionReason.trim()
    ) {
      setError(
        "Please enter a rejection reason.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        status === "APPROVED"
          ? "Approve this vendor profile?"
          : "Reject this vendor profile?",
      );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingAction(status);

      const response =
        await fetch(
          `/api/admin/vendors/${encodeURIComponent(
            vendorId,
          )}/approval`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              status,

              reason:
                status ===
                "REJECTED"
                  ? rejectionReason.trim()
                  : undefined,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to review vendor profile.",
        );
      }

      setSuccess(
        status === "APPROVED"
          ? "Vendor profile approved successfully."
          : "Vendor profile rejected successfully.",
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  if (
    currentStatus === "APPROVED"
  ) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-bold text-emerald-800">
          Vendor Approved
        </p>

        <p className="mt-2 text-sm text-emerald-700">
          This vendor profile is approved
          and can be shown to Clients.
        </p>
      </div>
    );
  }

  if (
    currentStatus === "REJECTED"
  ) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <p className="text-sm font-bold text-rose-800">
          Vendor Rejected
        </p>

        <p className="mt-2 text-sm text-rose-700">
          This vendor must edit the
          profile and resubmit it for
          Admin review.
        </p>

        {currentRejectionReason && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
              Rejection Reason
            </p>

            <p className="mt-2 text-sm text-rose-800">
              {
                currentRejectionReason
              }
            </p>
          </div>
        )}
      </div>
    );
  }

  if (
    currentStatus !==
    "PENDING_REVIEW"
  ) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-bold text-slate-700">
          Profile Incomplete
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Vendor has not submitted a
          complete profile for review
          yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div>
        <p className="text-sm font-bold text-amber-900">
          Admin Review Required
        </p>

        <p className="mt-2 text-sm text-amber-700">
          Check the vendor profile,
          business details, packages and
          images before approving.
        </p>
      </div>

      <div className="mt-5">
        <label
          htmlFor="rejectionReason"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600"
        >
          Rejection Reason
        </label>

        <textarea
          id="rejectionReason"
          rows={4}
          value={
            rejectionReason
          }
          onChange={(event) =>
            setRejectionReason(
              event.target.value,
            )
          }
          placeholder="Required only when rejecting the vendor..."
          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-medium text-rose-700">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-700">
            {success}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={
            loadingAction !== null
          }
          onClick={() =>
            submitReview(
              "APPROVED",
            )
          }
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingAction ===
          "APPROVED"
            ? "Approving..."
            : "Approve Vendor"}
        </button>

        <button
          type="button"
          disabled={
            loadingAction !== null
          }
          onClick={() =>
            submitReview(
              "REJECTED",
            )
          }
          className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingAction ===
          "REJECTED"
            ? "Rejecting..."
            : "Reject Vendor"}
        </button>
      </div>
    </div>
  );
}