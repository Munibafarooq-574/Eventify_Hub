// fyp-mobile/services/getUserPresence.ts
import axios from "axios";

export default async function getUserPresence(
    userId: string
): Promise<{ isOnline: boolean; lastSeen: string | null }> {
    const url = `https://eventify-hub.onrender.com/chat/presence/${userId}`;

    try {
        const response = await axios.get(url);
        return {
            isOnline: !!response.data?.isOnline,
            lastSeen: response.data?.lastSeen || null,
        };
    } catch (error) {
        console.error("Error fetching user presence:", error);
        return { isOnline: false, lastSeen: null };
    }
}