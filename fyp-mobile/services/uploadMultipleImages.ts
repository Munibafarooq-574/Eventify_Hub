// uploadMultipleImages.ts
/*import axios from 'axios';

/**
 * Uploads multiple images to the backend in chunks.
 *
 * @param {string} userId - The ID of the user uploading the images.
 * @param {string[]} imageUris - An array of local image URIs to upload.
 * @returns {Promise<string[]>} - Returns an array of URLs of the uploaded images.
 * @throws Will throw an error if the upload fails.
 */

/*export async function uploadMultipleImages(
    userId: string,
    imageUris: string[]
): Promise<string[]> {

    const url = `https://eventify-hub.onrender.com/vendor/image?userId=${userId}`;
    const CHUNK_SIZE = 8;
    let allUrls: string[] = [];

    for (let i = 0; i < imageUris.length; i += CHUNK_SIZE) {
        const chunk = imageUris.slice(i, i + CHUNK_SIZE);
        const formData = new FormData();

        chunk.forEach((uri, index) => {
            const uriParts = uri.split('.');
            const fileType = uriParts[uriParts.length - 1].toLowerCase();

            formData.append('files', {
                uri,
                name: `photo_${i + index}.${fileType}`,
                type: `image/${fileType}`,
            } as any);
        });

        try {
            const response = await axios.post(url, formData, {
                headers: {
                    Accept: 'application/json',
                },
                timeout: 1200000, // 20 minutes
            });

            allUrls = [...allUrls, ...(response.data.urls || [])];

        } catch (error: any) {
            console.error(
                "Upload error:",
                error?.response?.status,
                error?.response?.data || error?.message || error
            );
            throw error;
        }
    }

    return allUrls;
}*/


import axios from 'axios';

export interface UploadMediaAsset {
    uri: string;
    name: string;
    type: string;
}

/**
 * Uploads multiple images/videos to the backend in chunks.
 *
 * @param userId - ID of the vendor/user
 * @param assets - Local image/video assets
 * @returns Array of uploaded URLs
 */
export async function uploadMultipleImages(
    userId: string,
    assets: UploadMediaAsset[],
): Promise<string[]> {

    const url = `https://eventify-hub.onrender.com/vendor/image?userId=${userId}`;

    const CHUNK_SIZE = 8;
    let allUrls: string[] = [];

    for (let i = 0; i < assets.length; i += CHUNK_SIZE) {

        const chunk = assets.slice(i, i + CHUNK_SIZE);

        const formData = new FormData();

        chunk.forEach((asset) => {

            formData.append('files', {
                uri: asset.uri,
                name: asset.name,
                type: asset.type,
            } as any);

        });

        try {

            const response = await axios.post(url, formData, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'multipart/form-data',
                },

                // 20 minutes
                timeout: 1200000,
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

    return allUrls;
}