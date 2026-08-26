//fyp-mobile/services/postVendorReview.ts
import axios, { AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./apiConfig";
import { CreateReviewPayload } from "@/types/review";

export default async function postVendorReview(
  userId: string,
  reviewData: CreateReviewPayload & { reviewerName: string }
) {
  const config: AxiosRequestConfig = {
    method: "POST",
    url: `${API_BASE_URL}/reviews`,
    params: { userId },
    data: reviewData,
    headers: { "Content-Type": "application/json" },
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error("Error submitting vendor review:", error);
    throw error;
  }
}