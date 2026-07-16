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
    console.log("PATCH DATA:", businessDetails);
    console.log("USER ID:", userId);

    const response = await axios(config);

    console.log("PATCH RESPONSE:", response.data);

    return response.data;
  } catch (error) {
    console.error("Error updating business details:", error);
    throw error;
  }
}