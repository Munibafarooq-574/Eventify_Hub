// fyp-mobile/services/getBookingFinancials.ts
import axios, { AxiosRequestConfig } from "axios";

export default async function getBookingFinancials(vendorOrderId: string) {
    const url = `https://eventify-hub.onrender.com/payment/vendor-order/${vendorOrderId}/financials`;
    const config: AxiosRequestConfig = { method: "GET", url };
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error("Error fetching booking financials:", error);
        throw error;
    }
}