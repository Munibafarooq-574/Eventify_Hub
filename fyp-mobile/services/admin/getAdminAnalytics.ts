// fyp-mobile/services/admin/getAdminAnalytics.ts
import axios from "axios";
const BASE = `https://eventify-hub.onrender.com/admin/analytics`;

export async function getMonthlyRevenue(months = 6) {
    const { data } = await axios.get(`${BASE}/revenue`, { params: { months } });
    return data;
}
export async function getPopularServices() {
    const { data } = await axios.get(`${BASE}/popular-services`);
    return data;
}
export async function getVendorPerformance() {
    const { data } = await axios.get(`${BASE}/vendor-performance`);
    return data;
}
export async function getDemandInsights() {
    const { data } = await axios.get(`${BASE}/demand-insights`);
    return data;
}