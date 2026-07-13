
import { PhotographyBusinessDetailsDto } from "@/dto/CreatePhotographyBusinessDetails.dto";
import axios, { AxiosRequestConfig } from "axios";

export default async function postPhotographyBusinessDetails(userId: string, photographyBusinessDetails: PhotographyBusinessDetailsDto) {
    const url = `https://eventify-hub.onrender.com/vendor/buisnessDetails?userId=${userId}`;
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        method: "POST",
        url,
        data: photographyBusinessDetails,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching vendor categories:", error);
        throw error;
    }
}
