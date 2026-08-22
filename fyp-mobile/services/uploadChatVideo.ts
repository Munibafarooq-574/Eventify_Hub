
// fyp-mobile/services/uploadChatVideo.ts

import axios from "axios";

const BASE_URL = "https://eventify-hub.onrender.com";

export default async function uploadChatVideo(
  videoUri: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const url = `${BASE_URL}/chat/upload/video`;

  const formData = new FormData();

  const filename = `video-${Date.now()}.mp4`;

  formData.append("video", {
    uri: videoUri,
    name: filename,
    type: "video/mp4",
  } as any);

  try {
    console.log("VIDEO UPLOAD START:", videoUri);
    console.log("VIDEO UPLOAD URL:", url);

    const response = await axios.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },

      // Allow up to 5 minutes for large video uploads
      timeout: 5 * 60 * 1000,

      // Upload progress
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          const percent = Math.round(
            (e.loaded / e.total) * 100
          );

          console.log("VIDEO UPLOAD PROGRESS:", percent, "%");

          onProgress(percent);
        }
      },
    });

    console.log(
      "VIDEO UPLOAD RESPONSE:",
      JSON.stringify(response.data, null, 2)
    );

    const videoUrl = response.data?.videoUrl;

    // Backend must return videoUrl
    if (!videoUrl) {
      console.error(
        "VIDEO URL MISSING. Backend response:",
        JSON.stringify(response.data, null, 2)
      );

      throw new Error("Backend did not return a video URL");
    }

    // Backend already returns a complete URL
    if (videoUrl.startsWith("http")) {
      console.log("VIDEO UPLOAD SUCCESS:", videoUrl);
      return videoUrl;
    }

    // Backend normally returns:
    // /public/uploads/chat/video-xxxx.mp4
    const fullVideoUrl = `${BASE_URL}${
      videoUrl.startsWith("/") ? "" : "/"
    }${videoUrl}`;

    console.log("VIDEO UPLOAD SUCCESS:", fullVideoUrl);

    return fullVideoUrl;
  } catch (error: any) {
    console.error(
      "VIDEO UPLOAD ERROR:",
      error?.response?.data || error
    );

    throw error;
  }
}