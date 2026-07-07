import axios, { AxiosRequestConfig } from "axios";

export default async function getOrderStatsMonthly(userId: string) {
    const url = `http://13.233.214.252:3000/orders/stats/monthly?vendorId=${userId}`; // Backend URL to fetch conversations
    // const url = `http://192.168.100.15:3000/orders/stats/monthly?vendorId=${userId}`;
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        method: "GET",
        url,
    };

    try {
        // Send GET request to fetch conversation list
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching conversation list:", error);
        throw error; // Handle errors properly
    }
}
