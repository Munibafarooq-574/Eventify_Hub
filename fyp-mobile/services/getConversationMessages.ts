//fyp-mobile/services/getConversationMessage.ts

import axios from "axios";

export default async function getConversationMessages(
    chatId: string,
    userId: string
) {
    const url =
        `https://eventify-hub.onrender.com/chat/messages/${chatId}?userId=${userId}`;

    try {
        const response = await axios({
            method: "GET",
            url,
        });

        return response.data.messages;

    } catch (error) {
        console.error("Error fetching conversation messages:", error);
        throw error;
    }
}