//fyp-mobile/services/patchBusinessDetails.ts

import axios, { AxiosRequestConfig } from "axios";

export default async function patchBusinessDetails(
  userId: string,
  businessDetails: any
) {
  const url = `https://eventify-hub.onrender.com/vendor/buisnessDetails?userId=${userId}`;

  const config: AxiosRequestConfig = {
    method: "PATCH",
    url,
    data: businessDetails,
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error("Error updating business details:", error);
    throw error;
  }
}