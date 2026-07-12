import { CreateSalonBusinessDetailsDto } from "@/dto/CreateSalonBusinessDetails.dto";
import axios, { AxiosRequestConfig, AxiosError } from "axios";

export default async function postSalonBusinessDetails(userId: string, salonBusinessDetails: CreateSalonBusinessDetailsDto) {
    const url = `https://eventify-hub.onrender.com/vendor/buisnessDetails?userId=${userId}`;
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 30000, // 30s — Render cold start ke liye
        method: "POST",
        url,
        data: salonBusinessDetails,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
            console.error(
                "Error posting salon business details - server responded:",
                axiosError.response.status,
                axiosError.response.data
            );
        } else if (axiosError.request) {
            console.error(
                "Error posting salon business details - no response received (network/timeout):",
                axiosError.message
            );
        } else {
            console.error("Error posting salon business details - request setup failed:", axiosError.message);
        }
        throw error;
    }
}