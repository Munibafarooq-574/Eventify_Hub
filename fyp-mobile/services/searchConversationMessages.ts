// fyp-mobile/services/searchConversationMessages.ts
//
// Server-side, conversation-scoped, case-insensitive message search.
// NOTE: ChatScreen currently searches the already-loaded `messages` array
// locally instead of calling this on every keystroke (the conversation is
// fully loaded on open, so a network round trip per character would be
// wasted work). This service is kept for cases where the conversation
// isn't fully loaded locally (e.g. future pagination) — swap the local
// filter in ChatScreen's handleSearchQueryChange for this call if/when
// that becomes true.

import axios from "axios";

export default async function searchConversationMessages(
    chatId: string,
    userId: string,
    query: string
) {
    const url = `https://eventify-hub.onrender.com/chat/conversations/${chatId}/messages/search`;

    try {
        const response = await axios.get(url, {
            params: { q: query, userId },
        });

        return response.data.results || [];
    } catch (error) {
        console.error("Error searching messages:", error);
        throw error;
    }
}