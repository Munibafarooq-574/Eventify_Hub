import axios, { AxiosRequestConfig } from "axios";

// Function to create or get an existing conversation
export default async function createConversation(userId: string, vendorId: string) {
    const url = `http://13.233.214.252:3000/chat/${userId}/${vendorId}`; // Backend URL
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        method: "POST",
        url,
    };

    try {
        // Send the POST request to either create or get an existing conversation
        const response = await axios(config);
        return response.data;  // Returning the chatId
    } catch (error) {
        console.error("Error creating or fetching conversation:", error);
        throw error; // Handle errors properly
    }
}
