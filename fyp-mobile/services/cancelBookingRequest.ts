//fyp-mobile/services/cancelBookingRequest.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function cancelBookingRequest(
    vendorOrderId: string,
    reason?: string
) {
    const url = `https://eventify-hub.onrender.com/orders/vendor-order/${vendorOrderId}/cancel-request`;

    const config: AxiosRequestConfig = {
        method: "PATCH",
        url,
        data: { reason },
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error cancelling booking request:", error);
        throw error;
    }
}