import axios, { AxiosRequestConfig } from "axios";

export default async function getUserNotifications(userId: string) {
    const url = `http://13.233.214.252:3000/notifications/${userId}`; // Update to your backend base URL

    const config: AxiosRequestConfig = {
        method: "GET",
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
