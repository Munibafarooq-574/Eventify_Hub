// fyp-mobile/services/retryPayment.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function retryPayment(
    vendorOrderId: string,
    method: "card" | "jazzcash" | "easypaisa"
) {
    const url = `https://eventify-hub.onrender.com/payment/vendor-order/${vendorOrderId}/retry`;
    const config: AxiosRequestConfig = {
        method: "POST",
        url,
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