import axios, { AxiosRequestConfig } from "axios";

export default async function patchCompleteOrder(orderId: string) {
    const url = `http://13.233.214.252:3000/orders/complete-order/${orderId}`;
    const config: AxiosRequestConfig = {
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
