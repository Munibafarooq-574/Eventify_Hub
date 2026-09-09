import axios from "axios";
import {
  ReviewCategoryRequestInput,
} from "@/types/admin.types";

const API_BASE_URL =
  "https://eventify-hub.onrender.com";

export default async function adminReviewCategoryRequest(
  requestId: string,
  data: ReviewCategoryRequestInput
) {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/category/requests/${requestId}/review`,
      data
    );

    return response.data;
  } catch (error: any) {
    console.error(
      "Review category request error:",
      error?.response?.data || error?.message
    );

    throw error;
  }
}