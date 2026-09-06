// fyp-mobile/services/getVendorPayouts.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function getVendorPayouts(vendorId: string) {
    const url = `https://eventify-hub.onrender.com/payout`;
    const config: AxiosRequestConfig = {
        method: "GET",
        url,
        params: { vendorId },
    };
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching vendor payouts:", error);
        throw error;
    }
}