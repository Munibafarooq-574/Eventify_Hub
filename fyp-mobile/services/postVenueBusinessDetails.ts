

import { CreateVenueBusinessDetailsDto } from "@/dto/CreateVenueBusinessDetails.dto";
import axios, { AxiosRequestConfig } from "axios";

export default async function postVenueBusinessDetails(userId: string, vebueBusinessDetails: CreateVenueBusinessDetailsDto) {
    const url = `https://eventify-hub.onrender.com/vendor/buisnessDetails?userId=${userId}`;
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        method: "POST",
        url,
        data: vebueBusinessDetails,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching vendor categories:", error);
        throw error;
    }
}
