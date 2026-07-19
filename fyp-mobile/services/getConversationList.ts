import axios, { AxiosRequestConfig } from "axios";

export default async function getConversationList(userId: string) {
    const url = `https://eventify-hub.onrender.com/chat/${userId}`;

    const config: AxiosRequestConfig = {
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
        console.error("Error fetching conversation list:", error);
        throw error;
    }
}