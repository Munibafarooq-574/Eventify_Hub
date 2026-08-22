// fyp-mobile/services/getVendorAnalytics.ts
import axios, { AxiosRequestConfig } from "axios";
import { VendorAnalytics } from "@/types/vendorAnalytics";

export default async function getVendorAnalytics(vendorId: string): Promise<VendorAnalytics> {
    const url = `https://eventify-hub.onrender.com/vendor/analytics/${vendorId}`;
    // const url = `http://192.168.100.15:3000/vendor/analytics/${vendorId}`;

    const config: AxiosRequestConfig = {
        method: "GET",
        url,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching vendor analytics:", error);
        throw error;
    }
}