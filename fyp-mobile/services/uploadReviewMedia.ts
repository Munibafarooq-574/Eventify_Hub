import axios from 'axios';

export interface ReviewUploadAsset {
  uri: string;
  name: string;
  type: string;
}

export async function uploadReviewMedia(
  assets: ReviewUploadAsset[],
  token: string,
  onProgress?: (progress: number) => void,
): Promise<string[]> {
  const url =
    'https://eventify-hub.onrender.com/reviews/media';

  if (!assets.length) {
    onProgress?.(100);
    return [];
  }

  const CHUNK_SIZE = 8;
  const allUrls: string[] = [];

  let completedFiles = 0;

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
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },

        timeout: 120000,

        onUploadProgress: (event) => {
          if (!event.total) return;

          const chunkProgress =
            event.loaded / event.total;

          const overallProgress =
            ((completedFiles +
              chunkProgress * chunk.length) /
              assets.length) *
            100;

          onProgress?.(
            Math.min(99, Math.round(overallProgress)),
          );
        },
      });

      const urls = response.data?.urls;

      if (
        !Array.isArray(urls) ||
        urls.length !== chunk.length
      ) {
        throw new Error(
          'Invalid review media upload response.',
        );
      }

      allUrls.push(...urls);

      completedFiles += chunk.length;

      onProgress?.(
        Math.round(
          (completedFiles / assets.length) * 100,
        ),
      );
    } catch (error: any) {
      const serverMessage =
        error?.response?.data?.message;

      const message =
        typeof serverMessage === 'string'
          ? serverMessage
          : typeof serverMessage?.message === 'string'
            ? serverMessage.message
            : error?.message ||
              'Failed to upload review media.';

      throw new Error(message);
    }
  }

  onProgress?.(100);

  return allUrls;
}