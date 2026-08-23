//fyp-mobile/services/uploadChatImage.ts
import axios from "axios";

export default async function uploadChatImage(
  imageUri: string
): Promise<string> {
  const url = "https://eventify-hub.onrender.com/chat/upload";

  const formData = new FormData();

  const filename = `photo-${Date.now()}.jpg`;

  formData.append("image", {
    uri: imageUri,
    name: filename,
    type: "image/jpeg",
  } as any);

  try {
    console.log("IMAGE UPLOAD START:", imageUri);

    const response = await axios.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log(
      "IMAGE UPLOAD RESPONSE:",
      JSON.stringify(response.data, null, 2)
    );

    const imageUrl = response.data?.imageUrl;

    if (!imageUrl) {
      throw new Error("Backend did not return an image URL");
    }

    // Backend ab complete S3 URL return kar raha hai.
    // Isliye BASE_URL dobara add nahi karna.
    console.log("IMAGE UPLOAD SUCCESS:", imageUrl);

    return imageUrl;
  } catch (error: any) {
    console.error(
      "IMAGE UPLOAD ERROR:",
      error?.response?.data || error
    );

    throw error;
  }
}