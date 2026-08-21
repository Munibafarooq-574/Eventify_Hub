//fyp-mobile/services/uploadChatVideo.ts
import axios from "axios";

export default async function uploadChatVideo(videoUri: string): Promise<string> {
    const url = `https://eventify-hub.onrender.com/chat/upload/video`;

    const formData = new FormData();
    const filename = `video-${Date.now()}.mp4`;
    const type = "video/mp4";

    formData.append("video", {
        uri: videoUri,
        name: filename,
        type,
    } as any);

    try {
        const response = await axios.post(url, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        // backend returns { videoUrl: "/public/uploads/chat/xxx.mp4" }
        return `https://eventify-hub.onrender.com${response.data.videoUrl}`;
    } catch (error) {
        console.error("Error uploading chat video:", error);
        throw error;
    }
}