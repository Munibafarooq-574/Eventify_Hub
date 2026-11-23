import { API_BASE_URL } from './apiConfig';
import { bookingActionError } from './bookingActionError';
//fyp-mobile/services/patchUpdateOrderStatus.ts
/*import axios, { AxiosRequestConfig } from "axios";

export default async function patchUpdateOrderStatus(orderId: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled') {
    const url = `https://eventify-hub.onrender.com/orders/${orderId}/status`;

    const config: AxiosRequestConfig = {
        method: "PATCH",
        url,
        data: { status }, // Sending status in the request body
        headers: {
            "Content-Type": "application/json",
        },
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error updating order status:", error);
        throw error;
    }
}*/

// fyp-mobile/services/patchUpdateOrderStatus.ts

import axios, { AxiosRequestConfig } from "axios";
import { getSecureData } from "../store";

export default async function patchUpdateOrderStatus(
    orderId: string,
    status: "pending" | "confirmed" | "completed" | "cancelled"
) {
    const url = `https://eventify-hub.onrender.com/orders/${orderId}/status`;

    const config: AxiosRequestConfig = {
        method: "PATCH",
        url,
        data: { status },
        headers: {
            "Content-Type": "application/json",
        },
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error updating order status:", error);
        throw error;
    }
}

// Vendor-specific status update
export async function patchUpdateVendorOrderStatus(
    vendorOrderId: string,
    status: "pending" | "confirmed" | "completed" | "cancelled"
) {
    const token = await getSecureData("token");
    if (!token) throw new Error("Please sign in again.");
    const url = `https://eventify-hub.onrender.com/orders/vendor-order/${vendorOrderId}/status`;

    const config: AxiosRequestConfig = {
        method: "PATCH",
        url,
        data: { status },
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        throw bookingActionError(error, "Unable to update this booking. Please refresh and try again.");
    }
}
export async function acceptPendingVendorPackages(bookingIds: string[]) {
    const token = await getSecureData("token");
    if (!token) throw new Error("Please sign in again.");
    try {
        await axios.patch(
            `${API_BASE_URL}/orders/vendor-order/${bookingIds[0]}/accept-pending`,
            { bookingIds },
            { headers: { Authorization: `Bearer ${token}` } },
        );
    } catch (error) {
        throw bookingActionError(error, "Unable to accept the packages. Please refresh and try again.");
    }
}
