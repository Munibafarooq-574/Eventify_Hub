// fyp-mobile/services/postGenericBusinessDetails.ts

import { CreateGenericBusinessDetailsDto } from "@/dto/CreateGenericBusinessDetails.dto";
import axios, {
    AxiosError,
    AxiosRequestConfig,
} from "axios";

export default async function postGenericBusinessDetails(
    userId: string,
    genericBusinessDetails: CreateGenericBusinessDetailsDto
) {
    const url =
        `https://eventify-hub.onrender.com/vendor/buisnessDetails?userId=${userId}`;

    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 30000,
        method: "POST",
        url,
        data: genericBusinessDetails,
    };

    try {
        const response = await axios(config);

        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
            console.error(
                "Error posting generic business details:",
                axiosError.response.status,
                axiosError.response.data
            );
        } else if (axiosError.request) {
            console.error(
                "No response while posting generic business details:",
                axiosError.message
            );
        } else {
            console.error(
                "Generic business details request failed:",
                axiosError.message
            );
        }

        throw error;
    }
}