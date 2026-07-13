//fyp-mobile/services/postCateringBusinessDetails.ts
import { CreateCateringBusinessDetailsDto } from "@/dto/CreateCateringBusinessDetails.dto";
import axios, { AxiosRequestConfig } from "axios";

export default async function postCateringBusinessDetails(userId: string, cateringBusinessDetails: CreateCateringBusinessDetailsDto) {
    const url = `https://eventify-hub.onrender.com/vendor/buisnessDetails?userId=${userId}`;
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        method: "POST",
        url,
        data: cateringBusinessDetails,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching vendor categories:", error);
        throw error;
    }
}
