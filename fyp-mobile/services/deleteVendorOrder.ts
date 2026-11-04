import { getSecureData } from '@/store';
import axios, { AxiosRequestConfig } from "axios";

export default async function deleteVendorOrder(orderId: string) {
    const url = `https://eventify-hub.onrender.com/orders/${orderId}`;

    const token = await getSecureData("token");
    const config: AxiosRequestConfig = {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        method: "DELETE",
        url,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error deleting order:", error);
        throw error;
    }
}
