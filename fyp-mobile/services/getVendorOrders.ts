import axios, { AxiosRequestConfig } from "axios";

export interface GetOrdersResponse {
    totalAmount: string;
    orderId: string;
    eventName: string;
    clientName: string;
    eventDate: string;
    package: string;
    price: number;
    status: string;
    organizerId: any;
    vendorOrders: any;
}

export default async function getVendorOrders(type: string, userId: string, status?: string, limit = 10, skip = 0): Promise<GetOrdersResponse[]> {
    const url = `http://13.233.214.252:3000/orders`;
    // const url = `http://192.168.100.15:3000/orders`;
    const params = {
        type,
        userId,
        status,
        limit,
        skip,
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
        console.error("Error fetching orders:", error);
        throw error;
    }
}
