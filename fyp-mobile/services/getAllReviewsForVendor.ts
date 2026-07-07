import axios, { AxiosRequestConfig } from "axios";

export default async function getVendorReviews(vendorId: string) {
    const url = `http://13.233.214.252:3000/reviews?vendorId=${vendorId}`;
    const config: AxiosRequestConfig = {
        method: "GET",
        url,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching vendor reviews:", error);
        throw error;
    }
}
