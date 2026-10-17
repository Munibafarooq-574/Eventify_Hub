import axios, { AxiosRequestConfig } from "axios";

import { getSecureData } from "../store";

export default async function getUserNotifications(userId: string) {
    const token = await getSecureData("token");
    if (!token) throw new Error("Please sign in again.");
    const url = `https://eventify-hub.onrender.com/notifications/${userId}`; // Update to your backend base URL

    const config: AxiosRequestConfig = {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        url,
    };

    try {
        const response = await axios(config);
        return response.data.data; // Assuming your API returns { success, count, data }
    } catch (error) {
        console.error("Error fetching notifications:", error);
        throw error;
    }
}
