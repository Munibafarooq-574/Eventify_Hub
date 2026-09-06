// fyp-mobile/services/getPayoutStatus.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function getPayoutStatus(vendorOrderId: string) {
    const url = `https://eventify-hub.onrender.com/payout/vendor-order/${vendorOrderId}`;
    const config: AxiosRequestConfig = { method: "GET", url };
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching payout status:", error);
        throw error;
    }
}