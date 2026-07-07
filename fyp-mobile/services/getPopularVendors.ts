import axios, { AxiosRequestConfig } from "axios";

export interface TopVendor {
    vendorId: string;
    averageRating: number;
    totalReviews: number;
    vendor: {
        _id: string;
        name: string;
        coverImage?: string;
        contactDetails?: any;
        BusinessDetails?: {
            minimumPrice?: number;
            cityCovered?: string;
        };
        images?: string[];
    };
}

export default async function getPopularVendors(limit: number = 5): Promise<TopVendor[]> {
    const url = `http://13.233.214.252:3000/reviews/top-vendors`;
    // const url = `http://192.168.100.15:3000/reviews/top-vendors`;
    const params = { limit };

    const config: AxiosRequestConfig = {
        method: "GET",
        url,
        params,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching top vendors:", error);
        throw error;
    }
}
