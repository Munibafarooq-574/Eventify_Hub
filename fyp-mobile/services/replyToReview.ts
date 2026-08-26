//fyp-mobile/services/replyToReview.ts
import axios, { AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./apiConfig";
import { getSecureData } from "@/store";
import { ReplyToReviewPayload, ReplyToReviewResponse } from "@/types/review";

export default async function replyToReview(
  reviewId: string,
  payload: ReplyToReviewPayload
): Promise<ReplyToReviewResponse> {
  const token = await getSecureData("authToken"); // ⚠️ confirm this key matches your auth storage
  
  const config: AxiosRequestConfig = {
    method: "POST",
    url: `${API_BASE_URL}/reviews/${reviewId}/reply`,
    data: payload,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error("Error replying to review:", error);
    throw error;
  }
}