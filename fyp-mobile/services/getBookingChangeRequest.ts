// fyp-mobile/services/getBookingChangeRequest.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function getBookingChangeRequests(vendorOrderId: string) {
    const url = `https://eventify-hub.onrender.com/booking-change/vendor-order/${vendorOrderId}`;
    const config: AxiosRequestConfig = { method: "GET", url };
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching booking change requests:", error);
        throw error;
    }
}