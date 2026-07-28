
import axios from "axios";

export default async function uploadChatImage(imageUri: string): Promise<string> {
    const url = `https://eventify-hub.onrender.com/chat/upload`;

    const formData = new FormData();
    const filename = imageUri.split("/").pop() || `photo_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("image", {
        uri: imageUri,
        name: filename,
        type,
    } as any);

    try {
        const response = await axios.post(url, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        // backend returns { imageUrl: "/public/uploads/chat/xxx.jpg" }
        return `https://eventify-hub.onrender.com${response.data.imageUrl}`;
    } catch (error) {
        console.error("Error uploading chat image:", error);
        throw error;
    }
}