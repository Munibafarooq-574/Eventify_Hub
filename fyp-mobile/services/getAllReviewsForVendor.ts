
//fyp-mobile/services/getAllReviewsForVendor.ts
import axios, { AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./apiConfig";
import { ReviewFilter, ReviewListResponse } from "@/types/review";

export default async function getVendorReviews(
  filter: ReviewFilter
): Promise<ReviewListResponse> {
  const { vendorId, rating, withMedia, sort, page = 1, limit = 20 } = filter;

  const params: Record<string, string | number> = { vendorId, page, limit };

  if (rating) params.rating = rating;
  if (withMedia) params.withMedia = "true";
  if (sort) params.sort = sort;

  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${API_BASE_URL}/reviews`,
    params,
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error("Error fetching vendor reviews:", error);
    throw error;
  }
}