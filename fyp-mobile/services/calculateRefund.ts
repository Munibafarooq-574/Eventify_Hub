// fyp-mobile/services/calculateRefund.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function calculateRefund(vendorOrderId: string) {
    const url = `https://eventify-hub.onrender.com/cancellation/vendor-order/${vendorOrderId}/calculate-refund`;
    const config: AxiosRequestConfig = { method: "GET", url };
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error calculating refund:", error);
        throw error;
    }
}