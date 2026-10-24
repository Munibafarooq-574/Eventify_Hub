import { getSecureData } from '../store';
import { reportMarketplaceLoadError } from './reportMarketplaceLoadError';
import axios, { AxiosRequestConfig } from "axios";

export default async function getConversationList(userId: string) {
    const token = await getSecureData('token');
    if (!token) throw new Error('Your session has expired. Please sign in again.');
    const url = `https://eventify-hub.onrender.com/chat/${userId}`;

    const config: AxiosRequestConfig = {
        headers: { Authorization: `Bearer ${token}` },
        maxBodyLength: Infinity,
        method: "GET",
        url,
    };

    try {
        const response = await axios(config);

        console.log(
        "Conversation List:",
        JSON.stringify(response.data.conversations, null, 2)
    );

        const conversations = response.data.conversations || [];

        // Remove duplicate conversations based on chatId
        const uniqueConversations = conversations.filter(
            (conversation: any, index: number, self: any[]) =>
                index ===
                self.findIndex(
                    (c: any) => c.chatId === conversation.chatId
                )
        );

        return uniqueConversations;
    } catch (error) {
        reportMarketplaceLoadError('Booking chat unavailable', error);
        throw error;
    }
}