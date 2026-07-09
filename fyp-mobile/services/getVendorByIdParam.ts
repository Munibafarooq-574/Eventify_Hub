import axios, { AxiosRequestConfig } from "axios";

export default async function getVendorByIdParam(vendorId: string) {
    const url = `https://eventify-hub.onrender.com/vendor/${vendorId}`;
    const config: AxiosRequestConfig = {
        maxBodyLength: Infinity,
        method: "GET",
        url,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Error fetching vendor with ID ${vendorId}:`, error);
        throw error;
    }
}
