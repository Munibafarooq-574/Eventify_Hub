import axios, { AxiosRequestConfig } from "axios";

export default async function patchUpdateOrderStatus(orderId: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled') {
    const url = `http://13.233.214.252:3000/orders/${orderId}/status`;

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
}
