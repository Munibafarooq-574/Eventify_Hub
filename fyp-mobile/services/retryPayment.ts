// fyp-mobile/services/retryPayment.ts
import axios, { AxiosRequestConfig } from "axios";
import { getSecureData } from "@/store";

export default async function retryPayment(
    vendorOrderId: string,
    method: "card" | "jazzcash" | "easypaisa"
) {
    const url = `https://eventify-hub.onrender.com/payment/vendor-order/${vendorOrderId}/retry`;
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
        console.error("Error retrying payment:", error);
        throw error;
    }
}