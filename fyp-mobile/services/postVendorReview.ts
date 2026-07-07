import axios, { AxiosRequestConfig } from "axios";

export default async function postVendorReview(userId: string, reviewData: {
    vendorId: string;
    reviewText: string;
    rating: number;
    reviewerName: string;
}) {
    const url = `http://13.233.214.252:3000/reviews?userId=${userId}`;
    const config: AxiosRequestConfig = {
        method: "POST",
        url,
        data: reviewData,
        headers: {
            "Content-Type": "application/json",
        },
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error submitting vendor review:", error);
        throw error;
    }
}
