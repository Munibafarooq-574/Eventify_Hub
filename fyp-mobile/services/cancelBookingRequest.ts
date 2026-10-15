//fyp-mobile/services/cancelBookingRequest.ts
import axios, { AxiosRequestConfig } from "axios";
import { getSecureData } from "../store";

export default async function cancelBookingRequest(
    vendorOrderId: string,
    reason?: string
) {
    const token = await getSecureData("token");
    if (!token) throw new Error("Please sign in again.");
    const url = `https://eventify-hub.onrender.com/orders/vendor-order/${vendorOrderId}/cancel-request`;

    const config: AxiosRequestConfig = {
        method: "PATCH",
        url,
        data: { reason },
        headers: { Authorization: `Bearer ${token}` },
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error cancelling booking request:", error);
        throw error;
    }
}