import axios, { AxiosRequestConfig } from "axios";

export default async function getAllCategories() {
    const url = `https://eventify-hub.onrender.com/category`;
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        method: "GET",
        url,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching vendor categories:", error);
        throw error;
    }
}
