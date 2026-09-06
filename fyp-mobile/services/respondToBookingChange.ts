// fyp-mobile/services/respondToBookingChange.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function respondToBookingChange(
    changeRequestId: string,
    decision: "accepted" | "rejected",
    rejectionReason?: string
) {
    const url = `https://eventify-hub.onrender.com/booking-change/${changeRequestId}/respond`;
    const config: AxiosRequestConfig = {
        method: "PATCH",
        url,
        data: { decision, rejectionReason },
    };
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error responding to booking change:", error);
        throw error;
    }
}