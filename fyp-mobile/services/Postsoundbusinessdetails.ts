//fyp-mobile/services/Postsoundbusinessdetails.ts
import { CreateSoundBusinessDetailsDto } from "../dto/Createsoundbusinessdetails.dto";
import axios, { AxiosRequestConfig, AxiosError } from "axios";

export default async function postSoundBusinessDetails(
    userId: string,
    soundBusinessDetails: CreateSoundBusinessDetailsDto
) {
    const url = `https://eventify-hub.onrender.com/vendor/buisnessDetails?userId=${userId}`;
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 30000,
        method: "POST",
        url,
        data: soundBusinessDetails,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
            console.error(
                "Error posting sound business details - server responded:",
                axiosError.response.status,
                axiosError.response.data
            );
        } else if (axiosError.request) {
            console.error(
                "Error posting sound business details - no response received (network/timeout):",
                axiosError.message
            );
        } else {
            console.error("Error posting sound business details - request setup failed:", axiosError.message);
        }
        throw error;
    }
}