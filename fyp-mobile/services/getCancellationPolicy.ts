// fyp-mobile/services/getCancellationPolicy.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function getCancellationPolicy() {
    const url = `https://eventify-hub.onrender.com/cancellation/policy-config`;
    const config: AxiosRequestConfig = { method: "GET", url };
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching cancellation policy:", error);
        throw error;
    }
}