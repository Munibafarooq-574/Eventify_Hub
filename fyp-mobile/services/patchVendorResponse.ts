import { getSecureData } from '../store';
import axios, { AxiosRequestConfig } from "axios";

interface VendorResponsePayload {
    status: "accepted" | "rejected";
    message?: string;
}

export default async function patchVendorResponse(vendorOrderId: string, data: VendorResponsePayload) {
    const token = await getSecureData("token");
    if (!token) throw new Error("Your session has expired. Please sign in again.");
    const url = `https://eventify-hub.onrender.com/orders/vendor-response/${vendorOrderId}`;
    const config: AxiosRequestConfig = {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        url,
        data,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error updating vendor response:", error);
        throw error;
    }
}
