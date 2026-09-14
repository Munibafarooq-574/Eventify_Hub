// fyp-mobile/services/getVendorApprovalStatus.ts

import axios from "axios";

const BASE_URL =
  "https://eventify-hub.onrender.com";

export type VendorApprovalStatus =
  | "INCOMPLETE"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type VendorApprovalStatusResponse = {
  status: VendorApprovalStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
};

export default async function getVendorApprovalStatus(
  userId: string,
): Promise<VendorApprovalStatusResponse> {
  const response =
    await axios.get(
      `${BASE_URL}/vendor/approval-status/${encodeURIComponent(
        userId,
      )}`,
    );

  return response.data;
}