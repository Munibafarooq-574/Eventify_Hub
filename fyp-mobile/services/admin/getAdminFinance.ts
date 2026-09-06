// fyp-mobile/services/admin/getAdminFinance.ts
import axios from "axios";

const BASE = `https://eventify-hub.onrender.com/admin/finance`;

export async function getAdminPayments(status?: string) {
    const { data } = await axios.get(`${BASE}/payments`, { params: { status } });
    return data;
}

export async function getAdminRefunds(status?: string) {
    const { data } = await axios.get(`${BASE}/refunds`, { params: { status } });
    return data;
}

export async function updateRefundStatus(id: string, status: string) {
    const { data } = await axios.patch(`${BASE}/refunds/${id}/status`, { status });
    return data;
}

export async function getAdminPayouts(status?: string) {
    const { data } = await axios.get(`${BASE}/payouts`, { params: { status } });
    return data;
}