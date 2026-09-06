// fyp-mobile/services/admin/getAdminDisputes.ts
import axios from "axios";
const BASE = `https://eventify-hub.onrender.com/admin/disputes`;

export async function raiseDispute(vendorOrderId: string, raisedBy: "organizer" | "vendor", statement: string) {
    const { data } = await axios.post(`${BASE}/vendor-order/${vendorOrderId}`, { raisedBy, statement });
    return data;
}
export async function getDisputes(status?: string) {
    const { data } = await axios.get(BASE, { params: { status } });
    return data;
}
export async function getDisputeDetail(id: string) {
    const { data } = await axios.get(`${BASE}/${id}`);
    return data;
}
export async function resolveDispute(id: string, resolution: string, notes?: string, partialRefundAmount?: number) {
    const { data } = await axios.patch(`${BASE}/${id}/resolve`, { resolution, notes, partialRefundAmount });
    return data;
}