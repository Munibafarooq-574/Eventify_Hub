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
    const url = `https://eventify-hub.onrender.com/orders/vendor-order/${vendorOrderId}/status`;

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
        console.error("Error updating vendor order status:", error);
        throw error;
    }
}