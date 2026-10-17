
import axios, { AxiosRequestConfig } from "axios";

import { getSecureData } from "../store";

export default async function patchCompleteVendorOrder(vendorOrderId: string) {
    const token = await getSecureData("token");
    if (!token) throw new Error("Please sign in again.");
    const url = `https://eventify-hub.onrender.com/orders/complete-vendor/${vendorOrderId}`;
    const config: AxiosRequestConfig = {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        url,
    };

    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error completing vendor order:", error);
        throw error;
    }
}
