// fyp-mobile/services/checkRescheduleAvailability.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function checkRescheduleAvailability(
    vendorOrderId: string,
    payload: {
        requestedDate: string;
        requestedStartTime: string;
        durationMinutes: number;
        requestedPrice?: number;
    }
) {
    const url = `https://eventify-hub.onrender.com/booking-change/vendor-order/${vendorOrderId}/preview`;
    const config: AxiosRequestConfig = {
        method: "POST",
        url,
        data: payload,
    };
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error checking reschedule availability:", error);
        throw error;
    }
}