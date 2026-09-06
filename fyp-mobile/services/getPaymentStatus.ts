// fyp-mobile/services/getPaymentStatus.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function getPaymentStatus(vendorOrderId: string) {
    const url = `https://eventify-hub.onrender.com/payment/vendor-order/${vendorOrderId}`;
    const config: AxiosRequestConfig = { method: "GET", url };
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching payment status:", error);
        throw error;
    }
}