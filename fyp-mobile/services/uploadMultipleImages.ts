//fyp-mobile/services/uploadMultipleImages.ts
import axios from 'axios';

export interface UploadMediaAsset {
  uri: string;
  name: string;
  type: string;
}

export async function uploadMultipleImages(
  userId: string,
  assets: UploadMediaAsset[],
  onProgress?: (progress: number) => void,
): Promise<string[]> {
  const url = `https://eventify-hub.onrender.com/vendor/image?userId=${userId}`;

  const CHUNK_SIZE = 8;
  let allUrls: string[] = [];

  if (!assets.length) {
    onProgress?.(100);
    return [];
  }

  const totalFiles = assets.length;
  let completedFiles = 0;

  // Start at 0%
  onProgress?.(0);

  for (let i = 0; i < assets.length; i += CHUNK_SIZE) {
    const chunk = assets.slice(i, i + CHUNK_SIZE);

    const formData = new FormData();

    chunk.forEach((asset) => {
      formData.append(
        'files',
        {
          uri: asset.uri,
          name: asset.name,
          type: asset.type,
        } as any,
      );
    });

    try {
      const response = await axios.post(url, formData, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data',
        },

        timeout: 1200000,

        onUploadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded || 0;
          const total = progressEvent.total || 0;

          if (!total) {
            return;
          }

          const chunkProgress = loaded / total;

          const overallProgress =
            ((completedFiles + chunkProgress * chunk.length) /
              totalFiles) *
            100;

          onProgress?.(
            Math.min(99, Math.round(overallProgress)),
          );
        },
      });

      if (!response.data?.urls) {
        throw new Error(
          'Upload response does not contain URLs',
        );
      }

      allUrls = [
        ...allUrls,
        ...response.data.urls,
      ];

      completedFiles += chunk.length;

      onProgress?.(
        Math.min(
          100,
          Math.round((completedFiles / totalFiles) * 100),
        ),
      );
    } catch (error: any) {
      console.error(
        'Upload error:',
        error?.response?.status,
        error?.response?.data,
        error?.message,
      );

      throw error;
    }
  }

  onProgress?.(100);

  return allUrls;
}