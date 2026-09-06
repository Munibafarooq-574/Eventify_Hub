// fyp-mobile/services/payRemainingAmount.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function payRemainingAmount(
    vendorOrderId: string,
    method: "card" | "jazzcash" | "easypaisa"
) {
    const url = `https://eventify-hub.onrender.com/payment/vendor-order/${vendorOrderId}/remaining/initiate`;
    const config: AxiosRequestConfig = {
        method: "POST",
        url,
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