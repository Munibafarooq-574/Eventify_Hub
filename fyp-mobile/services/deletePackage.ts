import axios, { AxiosRequestConfig } from "axios";

export default async function deletePackage(packageId: string) {
    const url = `http://13.233.214.252:3000/vendor/package/${packageId}`;
    // const url = `http://192.168.100.15:3000/vendor/${packageId}`;

    const config: AxiosRequestConfig = {
        method: "DELETE",
        url,
        headers: {
            "Content-Type": "application/json",
        },
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error deleting package:", error);
        throw error;
    }
}
