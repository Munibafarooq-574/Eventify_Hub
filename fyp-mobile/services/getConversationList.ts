import axios, { AxiosRequestConfig } from "axios";

export default async function getConversationList(userId: string) {
    const url = `http://13.233.214.252:3000/chat/${userId}`; // Backend URL to fetch conversations
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        method: "GET",
        url,
    };

    try {
        // Send GET request to fetch conversation list
        const response = await axios(config);
        return response.data.conversations; // Returning the list of conversations
    } catch (error) {
        console.error("Error fetching conversation list:", error);
        throw error; // Handle errors properly
    }
}
