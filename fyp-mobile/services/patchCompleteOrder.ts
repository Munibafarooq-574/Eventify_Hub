import { getSecureData } from '@/store';
import axios, { AxiosRequestConfig } from "axios";

export default async function patchCompleteOrder(orderId: string) {
    const url = `https://eventify-hub.onrender.com/orders/complete-order/${orderId}`;
    const token = await getSecureData("token");
    const config: AxiosRequestConfig = {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        method: "PATCH",
        url,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error completing full order:", error);
        throw error;
    }
}
