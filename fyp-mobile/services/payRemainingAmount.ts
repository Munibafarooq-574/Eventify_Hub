// fyp-mobile/services/payRemainingAmount.ts
import axios, { AxiosRequestConfig } from "axios";
import { getSecureData } from "@/store";

export default async function payRemainingAmount(
    vendorOrderId: string,
    method: "card" | "jazzcash" | "easypaisa"
) {
    const url = `https://eventify-hub.onrender.com/payment/vendor-order/${vendorOrderId}/remaining/initiate`;
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
        console.error("Error paying remaining amount:", error);
        throw error;
    }
}