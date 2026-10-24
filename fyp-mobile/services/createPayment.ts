import { bookingActionError } from './bookingActionError';
// fyp-mobile/services/createPayment.ts
import axios, { AxiosRequestConfig } from "axios";
import { getSecureData } from "@/store";

export default async function createPayment(
    vendorOrderId: string,
    method: "card" | "jazzcash" | "easypaisa",
    sendReceipt?: boolean
) {
    const url = `https://eventify-hub.onrender.com/payment/vendor-order/${vendorOrderId}/initiate`;
    const token = await getSecureData("token");

const config: AxiosRequestConfig = {
    method: "POST",
    url,
    headers: token
        ? {
              Authorization: `Bearer ${token}`,
          }
        : {},
    data: { method, ...(sendReceipt !== undefined ? { sendReceipt } : {}) },
};
    try {
        const response = await axios(config);
        return response.data;
    } catch (error) {
        throw bookingActionError(error, "Unable to submit payment right now. Please refresh this booking and try again.");
    }
}