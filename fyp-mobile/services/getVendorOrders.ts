//fyp-mobile/services/getVendorOrders.ts
import axios, { AxiosRequestConfig } from "axios";

export interface GetOrdersResponse {
    _id: string;
    organizerId: {
        _id: string;
        name?: string;
        email?: string;
        phone?: string;
        contactDetails?: any;
    } | string | null;
    vendorOrders: {
        _id: string;
        vendorId: {
            _id: string;
            name?: string;
            email?: string;
            phone?: string;
            contactDetails?: any;
        } | string;
        serviceName: string;
        price: number;
        packageId?: string | null;
        status: string;
        message?: string;
        confirmationTime?: string;
    }[];
    eventName: string;
    eventType?: string;
    guests: number;
    eventDate: string;
    eventTime: string;
    totalAmount: number;
    discount: number;
    finalAmount: number;
    status: string;
    createdAt?: string;
    updatedAt?: string;
}

export default async function getVendorOrders(type: string, userId: string, status?: string, limit = 10, skip = 0): Promise<GetOrdersResponse[]> {
    const url = `https://eventify-hub.onrender.com/orders`;
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
