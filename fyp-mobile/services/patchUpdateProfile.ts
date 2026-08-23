//fyp-mobile/services/patchUpdateProfile.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function patchUpdateProfile(userId: string, formData: FormData) {
  const url = `https://eventify-hub.onrender.com/auth/update`;

  const config: AxiosRequestConfig = {
    method: "PATCH",
    url,
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };

  try {
    const response = await axios(config);
    return response.data; // Return updated user profile data
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
}