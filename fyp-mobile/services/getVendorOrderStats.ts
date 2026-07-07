import axios, { AxiosRequestConfig } from "axios";

interface OrderStats {
    totalOrders: number;
    pending: number;
    processing: number;
    completed: number;
}

export default async function getVendorOrderStats(type: string, userId: string): Promise<OrderStats> {
    const url = `http://13.233.214.252:3000/orders/stats`;
    // const url = `http://192.168.100.15:3000/orders/stats`;
    const params = {
        type,
        userId
    };
    const config: AxiosRequestConfig = {
        method: "GET",
        url,
        params,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching order stats:", error);
        throw error;
    }
}
