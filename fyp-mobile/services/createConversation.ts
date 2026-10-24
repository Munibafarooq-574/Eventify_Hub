import { getSecureData } from '../store';
import { reportMarketplaceLoadError } from './reportMarketplaceLoadError';
//fyp-mobile/services/createConversation.ts

import axios, { AxiosRequestConfig } from "axios";

// Function to create or get an existing conversation
export default async function createConversation(userId: string, vendorId: string) {
    const token = await getSecureData('token');
    if (!token) throw new Error('Your session has expired. Please sign in again.');
    const url = `https://eventify-hub.onrender.com/chat/${userId}/${vendorId}`; // Backend URL
    const config: AxiosRequestConfig = {
        headers: { Authorization: `Bearer ${token}` },
        maxBodyLength: Infinity,
        method: "POST",
        url,
    };

    try {
        // Send the POST request to either create or get an existing conversation
        const response = await axios(config);
        return response.data;  // Returning the chatId
    } catch (error) {
        reportMarketplaceLoadError('Booking chat unavailable', error);
        throw error; // Handle errors properly
    }
}
