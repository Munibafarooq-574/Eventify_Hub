
import { CreatePhotographerBusinessDetailsDto } from "@/dto/CreatePhotographyBusinessDetails.dto";
import axios, { AxiosRequestConfig } from "axios";

export default async function postPhotographyBusinessDetails(userId: string, photographyBusinessDetails: CreatePhotographerBusinessDetailsDto) {
    const url = `http://13.233.214.252:3000/vendor/buisnessDetails?userId=${userId}`;
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
