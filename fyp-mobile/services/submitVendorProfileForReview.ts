import axios from "axios";

export default async function submitVendorProfileForReview(
  userId: string
) {
  try {
    const response = await axios.post(
      `https://eventify-hub.onrender.com/vendor/submit-for-review?userId=${userId}`
    );

    return response.data;
  } catch (error: any) {
    console.error(
      "Submit vendor profile for review error:",
      error?.response?.data || error?.message || error
    );

    throw error;
  }
}