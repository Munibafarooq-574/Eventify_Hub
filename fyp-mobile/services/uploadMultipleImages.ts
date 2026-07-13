// uploadMultipleImages.ts
import axios from 'axios';

/**
 * Uploads multiple images to the backend.
 *
 * @param {string} userId - The ID of the user uploading the images.
 * @param {string[]} imageUris - An array of local image URIs to upload.
 * @param {string} token - The JWT access token for authentication.
 * @returns {Promise<string[]>} - Returns an array of URLs of the uploaded images.
 * @throws Will throw an error if the upload fails.
 */


export async function uploadMultipleImages(
    userId: string,
    imageUris: string[]
): Promise<string[]> {

    const url = `https://eventify-hub.onrender.com/vendor/image?userId=${userId}`;

    const formData = new FormData();

    imageUris.forEach((uri, index) => {
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1].toLowerCase();

        formData.append('files', {
            uri,
            name: `photo_${index}.${fileType}`,
            type: `image/${fileType}`,
        } as any);
    });

    try {
        const response = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.urls;

    } catch (error: any) {
        console.error(
            "Upload error:",
            error.response?.data || error.message
        );
        throw error;
    }
}