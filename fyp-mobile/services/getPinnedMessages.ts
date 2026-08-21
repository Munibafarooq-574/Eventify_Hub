// fyp-mobile/services/getPinnedMessages.ts
//
// Initial snapshot of pinned messages for a conversation, fetched once when
// ChatScreen mounts. Live pin/unpin updates after that come over the
// existing shared socket ('messagePinned' / 'messageUnpinned'), matching
// how delete-for-everyone already works (REST for the initial load, socket
// for live updates).

import axios from "axios";

export default async function getPinnedMessages(chatId: string, userId: string) {
    const url = `https://eventify-hub.onrender.com/chat/conversations/${chatId}/pinned`;

    try {
        const response = await axios.get(url, {
            params: { userId },
        });

        return response.data.pinnedMessages || [];
    } catch (error) {
        console.error("Error fetching pinned messages:", error);
        throw error;
    }
}