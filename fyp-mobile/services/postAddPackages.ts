// fyp-mobile/services/postAddPackages.ts

import { CreatePackagesDto } from "@/dto/CreatePackage.dto";
import axios, { AxiosRequestConfig } from "axios";

export default async function postAddPackages(
  userId: string,
  packages: CreatePackagesDto
) {
  const url =
    `https://eventify-hub.onrender.com/vendor/packages?userId=${userId}`;

  const config: AxiosRequestConfig = {
    maxBodyLength: Infinity,
    method: "POST",
    url,
    data: packages,
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error creating vendor packages:",
      error?.response?.data || error?.message || error
    );

    throw error;
  }
}