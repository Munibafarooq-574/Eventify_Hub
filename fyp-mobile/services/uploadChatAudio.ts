// fyp-mobile/services/uploadChatAudio.ts

import axios from "axios";

const BASE_URL = "https://eventify-hub.onrender.com";

export default async function uploadChatAudio(
  audioUri: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const url = `${BASE_URL}/chat/upload/audio`;

  const formData = new FormData();

  const filename = `voice-${Date.now()}.m4a`;

  formData.append("audio", {
    uri: audioUri,
    name: filename,
    type: "audio/m4a",
  } as any);

  try {
    console.log("AUDIO UPLOAD START:", audioUri);
    console.log("AUDIO UPLOAD URL:", url);

    const response = await axios.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },

      timeout: 2 * 60 * 1000,

      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          const percent = Math.round((e.loaded / e.total) * 100);
          console.log("AUDIO UPLOAD PROGRESS:", percent, "%");
          onProgress(percent);
        }
      },
    });

    console.log(
      "AUDIO UPLOAD RESPONSE:",
      JSON.stringify(response.data, null, 2)
    );

    const audioUrl = response.data?.audioUrl;

    if (!audioUrl) {
      console.error(
        "AUDIO URL MISSING. Backend response:",
        JSON.stringify(response.data, null, 2)
      );
      throw new Error("Backend did not return an audio URL");
    }

    if (audioUrl.startsWith("http")) {
      console.log("AUDIO UPLOAD SUCCESS:", audioUrl);
      return audioUrl;
    }

    const fullAudioUrl = `${BASE_URL}${
      audioUrl.startsWith("/") ? "" : "/"
    }${audioUrl}`;

    console.log("AUDIO UPLOAD SUCCESS:", fullAudioUrl);

    return fullAudioUrl;
  } catch (error: any) {
    console.error("AUDIO UPLOAD ERROR:", error?.response?.data || error);
    throw error;
  }
}