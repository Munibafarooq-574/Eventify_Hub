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

  const response = await axios(config);
  return response.data;
}
