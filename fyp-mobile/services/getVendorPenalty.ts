// fyp-mobile/services/getVendorPenalty.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function getVendorPenalty(vendorId: string) {
    const url = `https://eventify-hub.onrender.com/cancellation/vendor/${vendorId}/penalties`;
    const config: AxiosRequestConfig = { method: "GET", url };
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching vendor penalties:", error);
        throw error;
    }
}