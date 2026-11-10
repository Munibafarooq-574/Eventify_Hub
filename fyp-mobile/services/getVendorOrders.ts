import { getSecureData } from '@/store';
//fyp-mobile/services/getVendorOrders.ts
import axios, { AxiosRequestConfig } from "axios";
import { reportMarketplaceLoadError } from "./reportMarketplaceLoadError";

export interface GetOrdersResponse {
    currency?: 'PKR' | 'USD';
    _id: string;
    organizerId: {
        _id: string;
        name?: string;
        email?: string;
        phone?: string;
        contactDetails?: any;
    } | string | null;
    eventId?: string;
    replacementRescheduleRequestId?: string;
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
        replacesVendorOrderId?: string;
        packageId?: string | null;
        status: string;
        message?: string;
        confirmationTime?: string;
        cancelledBy?: string | null;
        cancelledAt?: string | null;
        cancellationReason?: string | null;
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

export default async function getVendorOrders(type: string, userId: string, status?: string, limit = 10, skip = 0, sessionToken?: string): Promise<GetOrdersResponse[]> {
    const url = `https://eventify-hub.onrender.com/orders`;
    // const url = `http://192.168.100.15:3000/orders`;
    const params = {
        type,
        userId,
        status,
        limit,
        skip,
    };

    const token = sessionToken ?? await getSecureData("token");
    const config: AxiosRequestConfig = {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        method: "GET",
        timeout: 10000,
        url,
        params,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        reportMarketplaceLoadError("Orders unavailable", error);
        throw error;
    }
}
