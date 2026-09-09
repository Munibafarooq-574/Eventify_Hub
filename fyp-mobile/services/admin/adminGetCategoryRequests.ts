// fyp-mobile/services/admin/adminGetCategoryRequests.ts

import axios from "axios";

import {
  AdminCategoryRequest,
  CategoryRequestStatus,
} from "@/types/admin.types";

const API_BASE_URL =
  "https://eventify-hub.onrender.com";

export default async function adminGetCategoryRequests(
  status?: CategoryRequestStatus
): Promise<AdminCategoryRequest[]> {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/admin/category-requests`,
      {
        params: status
          ? {
              status,
            }
          : undefined,
      }
    );

    return Array.isArray(response.data)
      ? response.data
      : [];
  } catch (error: any) {
    console.error(
      "Get admin category requests error:",
      error?.response?.data || error?.message
    );

    throw error;
  }
}