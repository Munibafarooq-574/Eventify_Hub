// fyp-mobile/services/requestBookingChange.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function requestBookingChange(
    vendorOrderId: string,
    payload: {
        requestedDate: string;
        requestedStartTime: string;
        durationMinutes: number;
        requestedGuests?: number;
        requestedLocation?: string;
        requestedServiceNote?: string;
        requestedPrice?: number;
    }
) {
    const url = `https://eventify-hub.onrender.com/booking-change/vendor-order/${vendorOrderId}/request`;
    const config: AxiosRequestConfig = {
        method: "POST",
        url,
        data: payload,
    };
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error requesting booking change:", error);
        throw error;
    }
}