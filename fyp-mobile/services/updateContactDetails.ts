//fyp-mobile/services/updateContactDetails.ts

import axios, { AxiosRequestConfig, AxiosError } from "axios";

export default async function updateContactDetails(userId: string, contactDetails: FormData) {
    const url = `https://eventify-hub.onrender.com/vendor/contactDetails?userId=${userId}`;
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000,
        method: "PATCH",
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
            console.error(
                "Error updating contact details - server responded:",
                axiosError.response.status,
                axiosError.response.data
            );
        } else if (axiosError.request) {
            console.error(
                "Error updating contact details - no response received:",
                axiosError.message
            );
        } else {
            console.error("Error updating contact details - request setup failed:", axiosError.message);
        }
        throw error;
    }
}