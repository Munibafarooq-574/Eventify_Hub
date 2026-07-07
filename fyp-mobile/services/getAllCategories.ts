import axios, { AxiosRequestConfig } from "axios";

export default async function getAllCategories() {
    const url = `http://13.233.214.252:3000/category`;
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
