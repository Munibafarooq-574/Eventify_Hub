// fyp-mobile/services/register.ts

import axios, { AxiosRequestConfig } from "axios";

export default async function Register(
  email: string,
  password: string,
  name: string,
  role: string,
  categoryId?: string,
  phone?: string,
  clientCityId?: string,
) {
  try {
    const url =
      "https://eventify-hub.onrender.com/auth/register";

    const data: Record<string, any> = {
      email,
      password,
      name,
      role,
      mobileNumber: phone,
    };

    /**
     * Category belongs only to Vendor registration.
     * Do not send an empty/fake category for Client.
     */
    if (
      role === "Vendor" &&
      categoryId
    ) {
      data.categoryId = categoryId;
    }

    /**
     * Canonical DB city belongs to Client registration.
     * Vendor location is handled separately through
     * the existing vendor contact-details flow.
     *
     * Keep it optional for backward compatibility.
     */
    if (
      role !== "Vendor" &&
      clientCityId
    ) {
      data.clientCityId =
        clientCityId;
    }

    const config: AxiosRequestConfig = {
      maxBodyLength: Infinity,
      method: "POST",
      url,
      data,
    };

    const response =
      await axios(config);

    return response.data;
  } catch (error: any) {
    if (
      error.response &&
      error.response.data &&
      error.response.data.message
    ) {
      throw error.response.data.message;
    }

    throw error.message;
  }
}