import { growthApi } from "./growthApiClient";
import axios from "axios";

export type CampaignStatus =
  | "draft"
  | "pending"
  | "approved"
  | "active"
  | "rejected"
  | "expired"
  | "cancelled";
  
export interface VendorCampaign {
  _id: string;
  vendorId: string;
  packageId: string;
  categoryId: string;

  title: string;
  image: string;
  description: string;
  offerLabel?: string | null;

  startDate: string;
  endDate: string;

  status: CampaignStatus;
rejectionReason?: string | null;

cancelledAt?: string | null;
cancelledReason?: string | null;

  impressions: number;
  clicks: number;
  packageVisits: number;

  createdAt: string;
  updatedAt: string;
}

export interface CampaignUsage {
  used: number;
  limit: number;
  remaining: number;
  canCreate: boolean;
}

export interface CreateCampaignInput {
  packageId: string;
  title: string;
  description: string;
  offerLabel?: string;
  startDate: string;
  endDate: string;
  image: {
    uri: string;
    name: string;
    type: string;
  };
}

/**
 * Get all campaigns created by the current vendor.
 */
export async function getMyVendorCampaigns(
  vendorId: string,
): Promise<VendorCampaign[]> {
  return growthApi.get<VendorCampaign[]>(
    `/vendor/growth/campaign/mine/${vendorId}`,
  );
}

/**
 * Get current month's campaign usage.
 *
 * Growth:  max 2/month
 * Premium: max 5/month
 */
export async function getVendorCampaignUsage(
  vendorId: string,
): Promise<CampaignUsage> {
  return growthApi.get<CampaignUsage>(
    `/vendor/growth/campaign/usage/${vendorId}`,
  );
}

/**
 * Create a campaign using multipart/form-data.
 *
 * Backend performs authoritative validation for:
 * - subscription entitlement
 * - monthly campaign limit
 * - package ownership
 * - campaign dates
 * - subscription expiry
 * - image validation
 */
export async function createVendorCampaign(
  vendorId: string,
  input: CreateCampaignInput,
): Promise<VendorCampaign> {
  const formData = new FormData();

  formData.append("packageId", input.packageId);
  formData.append("title", input.title.trim());
  formData.append(
    "description",
    input.description.trim(),
  );

  if (input.offerLabel?.trim()) {
    formData.append(
      "offerLabel",
      input.offerLabel.trim(),
    );
  }

  formData.append("startDate", input.startDate);
  formData.append("endDate", input.endDate);

  (formData as any).append("image", {
    uri: input.image.uri,
    name:
      input.image.name ||
      `campaign-${Date.now()}.jpg`,
    type:
      input.image.type || "image/jpeg",
  });

  try {
    const response = await axios.post(
      `https://eventify-hub.onrender.com/vendor/growth/campaign/${vendorId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000,
      },
    );

    return response.data as VendorCampaign;
  } catch (error: any) {
    const serverMessage =
      error?.response?.data?.message;

    const message =
      typeof serverMessage === "string"
        ? serverMessage
        : Array.isArray(serverMessage)
          ? serverMessage.join(", ")
          : typeof serverMessage?.message === "string"
            ? serverMessage.message
            : error?.message ||
              "Campaign creation failed";

    throw new Error(message);
  }
}

/**
 * Stop / cancel an existing campaign.
 *
 * Pending  -> Cancel Submission
 * Approved -> Cancel Campaign
 * Active   -> Stop Campaign
 *
 * Campaign is NOT deleted.
 * History, analytics and monthly quota usage remain preserved.
 */
export async function cancelVendorCampaign(
  vendorId: string,
  campaignId: string,
): Promise<VendorCampaign> {
  return growthApi.patch<VendorCampaign>(
    `/vendor/growth/campaign/${vendorId}/${campaignId}/cancel`,
    {},
  );
}