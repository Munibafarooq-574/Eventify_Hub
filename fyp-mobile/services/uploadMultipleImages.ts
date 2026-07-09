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
export async function uploadMultipleImages(userId: string, imageUris: string[]): Promise<string[]> {
    const url = `https://eventify-hub.onrender.com/vendor/image?userId=${userId}`; // Replace with your actual backend URL

    // Create a new FormData instance
    const formData = new FormData();

    // Append each image to the FormData instance
    imageUris.forEach((uri, index) => {
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1].toLowerCase();

        formData.append('files', {
            uri,
            name: `photo_${index}.${fileType}`,
            type: `image/${fileType}`,
        });
    });

    try {
        const response = await axios.post(url, formData, {
        });

        // Assuming the backend returns { message: string, urls: string[] }
        if (response.data && response.data.urls) {
            // Construct the full URLs if necessary
            const uploadedUrls = response.data.urls.map((url: any) => `https://eventify-hub.onrender.com${url}`); // Adjust based on your backend configuration
            return uploadedUrls;
        } else {
            throw new Error('Upload failed: No URLs returned');
        }
    } catch (error: any) {
        console.error('Error uploading images:', error.response?.data || error.message);
        throw error;
    }
}
