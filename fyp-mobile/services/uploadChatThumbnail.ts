// fyp-mobile/services/uploadChatThumbnail.ts
//
// Uploads a locally-generated video thumbnail (from expo-video-thumbnails)
// to the SAME backend endpoint used for chat images (POST /chat/upload),
// since a thumbnail is just a JPEG/PNG file. Reuses the existing
// FileInterceptor('image', ...) route in chat.controller.ts — no backend
// changes needed for this specific file.

import axios from "axios";

const BASE_URL = "https://eventify-hub.onrender.com";

export default async function uploadChatThumbnail(
  thumbnailUri: string
): Promise<string> {
  const url = `${BASE_URL}/chat/upload`;

  const formData = new FormData();
  const filename = `thumb-${Date.now()}.jpg`;

  // IMPORTANT: field name must be "image" — that's what
  // FileInterceptor('image', ...) in chat.controller.ts expects.
  formData.append("image", {
    uri: thumbnailUri,
    name: filename,
    type: "image/jpeg",
  } as any);

  try {
    console.log("THUMBNAIL UPLOAD START:", thumbnailUri);

    const response = await axios.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 30 * 1000, // thumbnails are tiny, 30s is plenty
    });

    console.log(
      "THUMBNAIL UPLOAD RESPONSE:",
      JSON.stringify(response.data, null, 2)
    );

    const imageUrl = response.data?.imageUrl;

    if (!imageUrl) {
      console.error(
        "THUMBNAIL URL MISSING. Backend response:",
        JSON.stringify(response.data, null, 2)
      );
      throw new Error("Backend did not return an image URL for thumbnail");
    }

    // If backend already returns a complete URL
    if (imageUrl.startsWith("http")) {
      console.log("THUMBNAIL UPLOAD SUCCESS:", imageUrl);
      return imageUrl;
    }

    // Backend normally returns:
    // /public/uploads/chat/xxxx.jpg
    const fullImageUrl = `${BASE_URL}${
      imageUrl.startsWith("/") ? "" : "/"
    }${imageUrl}`;

    console.log("THUMBNAIL UPLOAD SUCCESS:", fullImageUrl);

    return fullImageUrl;
  } catch (error: any) {
    console.error(
      "THUMBNAIL UPLOAD ERROR:",
      error?.response?.data || error
    );

    // Non-fatal by design — callers should catch this and just send the
    // video without a thumbnail rather than blocking the whole send.
    throw error;
  }
}