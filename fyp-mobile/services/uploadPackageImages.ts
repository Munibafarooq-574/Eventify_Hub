import axios from "axios";

export interface PackageUploadAsset {
  uri: string;
  name: string;
  type: string;
}

export async function uploadPackageImages(
  packageId: string,
  assets: PackageUploadAsset[],
  onProgress?: (progress: number) => void,
): Promise<string[]> {
  const url = `https://eventify-hub.onrender.com/vendor/package/${packageId}/images`;

  if (!assets.length) {
    onProgress?.(100);
    return [];
  }

  const formData = new FormData();

  assets.forEach((asset) => {
    formData.append(
      "files",
      {
        uri: asset.uri,
        name: asset.name,
        type: asset.type,
      } as any,
    );
  });

  const response = await axios.post(url, formData, {
    headers: {
      Accept: "application/json",
      "Content-Type": "multipart/form-data",
    },
    timeout: 1200000,

    onUploadProgress: (progressEvent) => {
      const loaded = progressEvent.loaded || 0;
      const total = progressEvent.total || 0;

      if (!total) return;

      const progress = Math.round((loaded / total) * 100);
      onProgress?.(Math.min(progress, 100));
    },
  });

  if (!response.data?.urls) {
    throw new Error("Package image upload failed");
  }

  return response.data.urls;
}