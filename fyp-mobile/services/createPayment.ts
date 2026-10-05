// fyp-mobile/services/createPayment.ts
import axios, { AxiosRequestConfig } from "axios";
import { getSecureData } from "@/store";

export default async function createPayment(
    vendorOrderId: string,
    method: "card" | "jazzcash" | "easypaisa"
) {
    const url = `https://eventify-hub.onrender.com/payment/vendor-order/${vendorOrderId}/initiate`;
    const token = await getSecureData("token");

const config: AxiosRequestConfig = {
    method: "POST",
    url,
    headers: token
        ? {
              Authorization: `Bearer ${token}`,
          }
        : {},
    data: { method },
};
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error creating payment:", error);
        throw error;
    }
}