import { getSecureData } from '../store';
import { reportMarketplaceLoadError } from './reportMarketplaceLoadError';
import axios, { AxiosRequestConfig } from "axios";

let snapshot: { userId: string; token: string; rows: any[] } | undefined;
let inFlight: { userId: string; token: string; request: Promise<any[]> } | undefined;

export default async function getConversationList(userId: string, showCached?: (rows: any[]) => void) {
    const token = await getSecureData('token');
    if (!token) throw new Error('Your session has expired. Please sign in again.');
    if (snapshot?.userId === userId && snapshot.token === token) showCached?.(snapshot.rows);
    if (inFlight?.userId === userId && inFlight.token === token) return inFlight.request;

    const url = `https://eventify-hub.onrender.com/chat/${userId}`;

    const config: AxiosRequestConfig = {
        headers: { Authorization: `Bearer ${token}` },
        maxBodyLength: Infinity,
        method: "GET",
        url,
    };

    const request = (async () => {
      try {
        const response = await axios(config);

        const conversations = Array.isArray(response.data.conversations) ? response.data.conversations : [];

        // Remove duplicate conversations based on chatId
        const uniqueConversations = conversations.filter(
            (conversation: any, index: number, self: any[]) =>
                index ===
                self.findIndex(
                    (c: any) => c.chatId === conversation.chatId
                )
        );

        if (inFlight?.userId === userId && inFlight.token === token) {
            snapshot = { userId, token, rows: uniqueConversations };
        }
        return uniqueConversations;
      } catch (error) {
        reportMarketplaceLoadError('Booking chat unavailable', error);
        throw error;
      }
    })();
    inFlight = { userId, token, request };
    try {
        return await request;
    } finally {
        if (inFlight?.request === request) inFlight = undefined;
    }
}