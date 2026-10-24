import { getSecureData } from '../store';
import { reportMarketplaceLoadError } from './reportMarketplaceLoadError';
//fyp-mobile/services/getConversationMessage.ts

import axios from "axios";

export default async function getConversationMessages(
    chatId: string,
    userId: string
) {
    const token = await getSecureData('token');
    if (!token) throw new Error('Your session has expired. Please sign in again.');
    const url =
        `https://eventify-hub.onrender.com/chat/messages/${chatId}?userId=${userId}`;

    try {
        const response = await axios({
            headers: { Authorization: `Bearer ${token}` },
            method: "GET",
            url,
        });

        return response.data.messages;

    } catch (error) {
        reportMarketplaceLoadError('Booking chat unavailable', error);
        throw error;
    }
}