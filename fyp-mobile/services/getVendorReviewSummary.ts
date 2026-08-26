//fyp-mobile/services/getVendorReviewSummary.ts
import axios, { AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./apiConfig";
import { ReviewSummary } from "@/types/review";

export default async function getVendorReviewSummary(
  vendorId: string
): Promise<ReviewSummary> {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${API_BASE_URL}/reviews/summary`,
    params: { vendorId },
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error("Error fetching review summary:", error);
    throw error;
  }
}