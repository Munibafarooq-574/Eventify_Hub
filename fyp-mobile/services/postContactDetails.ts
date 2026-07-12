import axios, { AxiosRequestConfig, AxiosError } from "axios";

export default async function postContactDetails(userId: string, contactDetails: FormData) {
    const url = `https://eventify-hub.onrender.com/vendor/contactDetails?userId=${userId}`;
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000, // 60s — file upload + Render cold start ke liye
        method: "POST",
        url,
        data: contactDetails,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
            // Server ne response diya lekin error status ke sath (4xx/5xx)
            console.error(
                "Error posting contact details - server responded:",
                axiosError.response.status,
                axiosError.response.data
            );
        } else if (axiosError.request) {
            // Request gayi, response nahi mila (network error / timeout / cold start)
            console.error(
                "Error posting contact details - no response received (network/timeout):",
                axiosError.message
            );
        } else {
            console.error("Error posting contact details - request setup failed:", axiosError.message);
        }
        throw error;
    }
}