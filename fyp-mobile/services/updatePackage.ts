import axios, { AxiosRequestConfig } from "axios";

export default async function updatePackage(packageId: string, updatedData: any) {
    const url = `http://13.233.214.252:3000/vendor/package/${packageId}`;
    // const url = `http://192.168.100.15:3000/vendor/package/${packageId}`;

    const config: AxiosRequestConfig = {
        method: "PATCH",
        url,
        data: updatedData, // Sending status in the request body
        headers: {
            "Content-Type": "application/json",
        },
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error updating order status:", error);
        throw error;
    }
}
