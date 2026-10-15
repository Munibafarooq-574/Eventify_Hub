// fyp-mobile/services/getVendorPenalty.ts
import axios, { AxiosRequestConfig } from "axios";
import { getSecureData } from "../store";

export default async function getVendorPenalty(vendorId: string) {
    const token = await getSecureData("token");
    if (!token) throw new Error("Please sign in again.");
    const url = `https://eventify-hub.onrender.com/cancellation/vendor/${vendorId}/penalties`;
    const config: AxiosRequestConfig = { method: "GET", url, headers: { Authorization: `Bearer ${token}` } };
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching vendor penalties:", error);
        throw error;
    }
}