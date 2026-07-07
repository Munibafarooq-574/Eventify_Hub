import axios, { AxiosRequestConfig } from "axios";

interface VendorResponsePayload {
    status: "accepted" | "rejected";
    message?: string;
}

export default async function patchVendorResponse(vendorOrderId: string, data: VendorResponsePayload) {
    const url = `http://13.233.214.252:3000/orders/vendor-response/${vendorOrderId}`;
    const config: AxiosRequestConfig = {
        method: "PATCH",
        url,
        data,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error updating vendor response:", error);
        throw error;
    }
}
