// fyp-mobile/services/cancelConfirmedBooking.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function cancelConfirmedBooking(
    vendorOrderId: string,
    role: "organizer" | "vendor",
    reason?: string
) {
    const endpoint =
        role === "organizer"
            ? "organizer-cancel-confirmed"
            : "vendor-cancel-confirmed";

    const url = `https://eventify-hub.onrender.com/cancellation/vendor-order/${vendorOrderId}/${endpoint}`;

    const config: AxiosRequestConfig = {
        method: "PATCH",
        url,
        data: { reason },
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error cancelling confirmed booking:", error);
        throw error;
    }
}