// uploadMultipleImages.ts
import axios from 'axios';

/**
 * Uploads multiple images to the backend in chunks.
 *
 * @param {string} userId - The ID of the user uploading the images.
 * @param {string[]} imageUris - An array of local image URIs to upload.
 * @returns {Promise<string[]>} - Returns an array of URLs of the uploaded images.
 * @throws Will throw an error if the upload fails.
 */

export async function uploadMultipleImages(
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
                timeout: 120000, // 2 min
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
}